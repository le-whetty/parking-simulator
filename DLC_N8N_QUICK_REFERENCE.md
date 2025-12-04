# n8n Quick Reference - DLC Unlock Workflow

## Complete n8n Node Configuration

### Node 1: Slack Webhook Trigger
- **Type**: Webhook
- **Method**: POST
- **Path**: `dlc-unlock` (or your chosen path)
- **Response Mode**: Respond When Last Node Finishes

### Node 2: Filter Node (Optional but Recommended)
- **Condition**: `{{ $json.text }}` contains `"Parking Simulator DLC Unlock"`
- **Continue on Fail**: No

### Node 3: Extract Data (Function Node)
```javascript
// Extract dlc_code and user_email from Slack message
// Assuming your n8n workflow already extracts user_email from the game
const slackData = $input.first().json;

// Extract from message text if needed, or use from workflow output
const message = slackData.text || '';
const lines = message.split('\n');

let dlcCode = '';
let userEmail = slackData.user_email || slackData.email || ''; // Use email from workflow if available

lines.forEach(line => {
  if (line.includes('DLC Code:') || line.includes('DLC:')) {
    dlcCode = line.split(':')[1].trim();
  }
  if (line.includes('Email:') || line.includes('User Email:')) {
    userEmail = line.split(':')[1].trim().toLowerCase();
  }
});

if (!dlcCode) {
  throw new Error(`Missing DLC Code in message`);
}

if (!userEmail) {
  throw new Error(`Missing user email. Email must be provided in the message or workflow output.`);
}

return {
  user_email: userEmail.toLowerCase().trim(),
  dlc_code: dlcCode,
  unlocked_via: 'spark_spend',
  slack_user_id: slackData.user || slackData.slack_user_id || '',
  slack_message_ts: slackData.ts || slackData.message_ts || ''
};
```

### Node 4: Insert DLC Unlock (Supabase Node)
- **Operation**: Insert
- **Table**: `dlc_unlocks`
- **Columns**:
  - `user_email`: `{{ $json.user_email }}`
  - `dlc_code`: `{{ $json.dlc_code }}`
  - `unlocked_via`: `{{ $json.unlocked_via }}`
  - `slack_user_id`: `{{ $json.slack_user_id }}`
  - `slack_message_ts`: `{{ $json.slack_message_ts }}`
- **Additional Fields** → **Upsert Conflict Target**: `user_email,dlc_code`
- **Additional Fields** → **Upsert Conflict Action**: `Do Nothing`

### Node 5: Success Response (Optional)
- **Type**: Respond to Webhook
- **Response Code**: 200
- **Response Body**:
  ```json
  {
    "success": true,
    "message": "DLC unlocked successfully",
    "user_email": "{{ $json.user_email }}",
    "dlc_code": "{{ $json.dlc_code }}"
  }
  ```

### Error Handling Node (Parallel Path)
- **Type**: Error Trigger
- **On Error**: Continue Workflow
- **Error Message**: `{{ $json.error.message }}`

## Testing the Workflow

### Test Payload (for manual testing in n8n)
```json
{
  "text": "Parking Simulator DLC Unlock\nDLC Code: DLC_001\nEmail: peter@gotracksuit.com",
  "user": "U123456",
  "ts": "1764763038.502509",
  "user_email": "peter@gotracksuit.com",
  "dlc_code": "DLC_001"
}
```

### Expected Output
```json
{
  "success": true,
  "user_email": "peter@gotracksuit.com",
  "dlc_code": "DLC_001"
}
```

