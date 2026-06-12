# IPBL Phase C recorder scheduler

Vercel Hobby cron permits only daily execution, so production minute-level recording is triggered by the root-owned VM timer. The Vercel API remains the application and Redis write boundary.

The installer must:

1. retrieve the existing production `CRON_SECRET` without printing it;
2. write `/etc/ipbl-recorder.env` as root mode `0600`;
3. install the trigger as `/usr/local/sbin/ipbl-recorder-trigger`;
4. install and enable the service/timer units;
5. verify the secured endpoint, public status endpoint, and a per-game history row.

Never commit or print the secret value.
