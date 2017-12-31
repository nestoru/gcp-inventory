# gcp-inventory
A project aimed at creating the  simplest possible inventory from GCP

## Install
```
git clone https://github.com/nestoru/gcp-inventory.git
cd gcp-inventory
npm install
```

## Run
```
set -a \
TMP_DIR=/tmp \
&& GCP_BUCKET=*** \
&& SMTP_USER=*** \
&& SMTP_PASSWORD=*** \
&& SMTP_HOST=*** \
&& SMTP_PORT=*** \
&& SMTP_FROM=*** \
&& SMTP_TO=***m \
&& node gcp-inventory.js \
&& set +a
```

## Cron it
- Include ENV VARS in ~/.profile 
- Cron it, for example at 8 AM on the 1st of every month
```
0 8 1 * * . ~/.profile && (mkdir -p /tmp/gcp-inventory && cd /tmp/gcp-inventory && git pull) || (rm -fr /tmp/gcp-inventory && cd /tmp && git clone https://github.com/nestoru/gcp-inventory.git) && cd /tmp/gcp-inventory && npm install && node gcp-inventory.js
```
