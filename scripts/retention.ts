import { tx,pool } from '../src/lib/db';
await tx(async db=>{
 await db.query("DELETE FROM outbox WHERE challenge_id IN (SELECT id FROM otp_challenges WHERE expires_at<now()-interval '1 day') AND state<>'SUBMITTING'");
 await db.query("DELETE FROM otp_challenges WHERE expires_at<now()-interval '1 day' AND id NOT IN (SELECT challenge_id FROM outbox WHERE challenge_id IS NOT NULL)");
 await db.query('DELETE FROM sessions WHERE expires_at<now()');
 await db.query('DELETE FROM rate_limits WHERE reset_at<now()');
 await db.query("DELETE FROM outbox WHERE incident_id IN (SELECT id FROM incidents WHERE created_at<now()-interval '30 days') AND state<>'SUBMITTING'");
 await db.query("DELETE FROM incidents WHERE created_at<now()-interval '30 days' AND id NOT IN (SELECT incident_id FROM outbox WHERE incident_id IS NOT NULL)");
 await db.query("DELETE FROM webhook_events WHERE received_at<now()-interval '30 days'");
 await db.query("DELETE FROM audit_log WHERE created_at<now()-interval '90 days'");
 await db.query("DELETE FROM notification_budget WHERE day<CURRENT_DATE-90");
});console.log('Retention complete.');await pool.end();
