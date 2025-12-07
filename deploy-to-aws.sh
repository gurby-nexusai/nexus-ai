#!/bin/bash

# Safe AI Marketplace - AWS Deployment Script

set -e

echo "🚀 Starting AWS Marketplace Deployment..."

# Configuration
STACK_NAME="safe-ai-marketplace"
REGION="us-east-1"
S3_BUCKET="${STACK_NAME}-deployment-$(date +%s)"

# Step 1: Build the application
echo "📦 Building application..."
npm run build

# Step 2: Create CloudFormation stack
echo "☁️  Creating CloudFormation stack..."
aws cloudformation create-stack \
  --stack-name $STACK_NAME \
  --template-body file://cloudformation-template.yaml \
  --capabilities CAPABILITY_IAM \
  --region $REGION

echo "⏳ Waiting for stack creation..."
aws cloudformation wait stack-create-complete \
  --stack-name $STACK_NAME \
  --region $REGION

# Step 3: Get outputs
echo "📋 Getting stack outputs..."
WEBSITE_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`S3BucketName`].OutputValue' \
  --output text)

CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
  --output text)

USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

# Step 4: Upload build files to S3
echo "📤 Uploading files to S3..."
aws s3 sync dist/ s3://$WEBSITE_BUCKET/ \
  --delete \
  --cache-control "public, max-age=31536000" \
  --region $REGION

# Step 5: Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
DISTRIBUTION_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[0].DomainName=='${WEBSITE_BUCKET}.s3.amazonaws.com'].Id" \
  --output text)

if [ ! -z "$DISTRIBUTION_ID" ]; then
  aws cloudfront create-invalidation \
    --distribution-id $DISTRIBUTION_ID \
    --paths "/*"
fi

# Step 6: Display results
echo ""
echo "✅ Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Website URL: https://$CLOUDFRONT_URL"
echo "👤 User Pool ID: $USER_POOL_ID"
echo "🪣 S3 Bucket: $WEBSITE_BUCKET"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next Steps:"
echo "1. Configure custom domain in Route 53"
echo "2. Set up SSL certificate in ACM"
echo "3. Update CloudFront distribution with custom domain"
echo "4. Configure AWS Bedrock access"
echo "5. Submit to AWS Marketplace"
echo ""
