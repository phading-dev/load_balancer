#!/bin/bash
# GCP auth
gcloud auth application-default login
gcloud config set project phading-dev

# Create the builder service account
gcloud iam service-accounts create load-balancer-builder

# Grant permissions to the builder service account
gcloud projects add-iam-policy-binding phading-dev --member="serviceAccount:load-balancer-builder@phading-dev.iam.gserviceaccount.com" --role='roles/cloudbuild.builds.builder' --condition=None
gcloud projects add-iam-policy-binding phading-dev --member="serviceAccount:load-balancer-builder@phading-dev.iam.gserviceaccount.com" --role='roles/container.developer' --condition=None
