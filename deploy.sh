#!/bin/bash
if [ -z $1 ]; then
    echo "Missing AWS_PROFILE parameter"
    return
fi
if [ -z $2 ]; then
    echo "Missing STAGE parameter"
    return
fi
if [ -z $3 ]; then
    echo "Missing REGION parameter"
    return
fi
export AWS_PROFILE=$1
export STAGE=$2
export AWS_REGION=$3

SUBDOMAIN=$(if [ "${STAGE}" = "prod" ]; then echo ""; else echo "${STAGE}."; fi)
STACK_NAME="serverletto-${STAGE}"

cd backend
echo -e "profile: ${AWS_PROFILE}
region: ${AWS_REGION}
hostedzoneid: Z02504133Y4Q2IK18QDO
domain: ${SUBDOMAIN}serverletto.net
lambda:
  memorySize: 128
  timeout: 10
  logRetention: 1
" > config/stages/${STAGE}.yml
npx sls deploy -s $STAGE
aws cloudformation describe-stacks --stack-name serverletto-${STAGE} --query "Stacks[0].Outputs" > /tmp/cf-outputs.json
export CF_REGION=$(jq -r '.[] | select(.OutputKey=="OutRegion") | .OutputValue' < /tmp/cf-outputs.json)
export CF_USERPOOLID=$(jq -r '.[] | select(.OutputKey=="OutCognitoUserId") | .OutputValue' < /tmp/cf-outputs.json)
export CF_CLIENTID=$(jq -r '.[] | select(.OutputKey=="OutCognitoClientId") | .OutputValue' < /tmp/cf-outputs.json)
export CF_IMAGEBUCKET=$(jq -r '.[] | select(.OutputKey=="OutS3BucketName") | .OutputValue' < /tmp/cf-outputs.json)
export CF_HOSTINGBUCKET=$(jq -r '.[] | select(.OutputKey=="OutHostingBucketName") | .OutputValue' < /tmp/cf-outputs.json)
export CF_APIDOMAIN=$(jq -r '.[] | select(.OutputKey=="OutDomainApiMappingDomain") | .OutputValue' < /tmp/cf-outputs.json)
export CF_DOMAIN=$(jq -r '.[] | select(.OutputKey=="OutDomainHostingDnsHostingDomain") | .OutputValue' < /tmp/cf-outputs.json)
cd ..
envsubst < aws-exports.js.template > frontend/src/aws-exports.js
aws s3 cp src/assets/slsguru.svg s3://${CF_IMAGEBUCKET}/dist/slsguru.svg

cd frontend
quasar build

aws s3 cp --recursive dist/spa/ s3://${CF_HOSTINGBUCKET}/
aws cloudfront create-invalidation --distribution-id $(aws cloudfront list-distributions --query "DistributionList.Items[?Comment==\`serverletto-${STAGE}-hosting\`].Id" --output text) --paths "/*"
cd ..