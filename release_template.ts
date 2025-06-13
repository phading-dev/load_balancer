import { ENV_VARS } from "./env_vars";
import { COMMENT_WEB_SERVICE } from "@phading/comment_service_interface/service";
import {
  K8S_SERVICE_NAME as COMMENT_SERVICE_NAME,
  K8S_SERVICE_PORT as COMMENT_SERVICE_PORT,
} from "@phading/comment_service_interface/service_const";
import {
  COMMERCE_NODE_SERVICE,
  COMMERCE_WEB_SERVICE,
} from "@phading/commerce_service_interface/service";
import {
  K8S_SERVICE_NAME as COMMERCE_SERVICE_NAME,
  K8S_SERVICE_PORT as COMMERCE_SERVICE_PORT,
} from "@phading/commerce_service_interface/service_const";
import {
  METER_NODE_SERVICE,
  METER_WEB_SERVICE,
} from "@phading/meter_service_interface/service";
import {
  K8S_SERVICE_NAME as METER_SERVICE_NAME,
  K8S_SERVICE_PORT as METER_SERVICE_PORT,
} from "@phading/meter_service_interface/service_const";
import {
  PLAY_ACTIVITY_NODE_SERVICE,
  PLAY_ACTIVITY_WEB_SERVICE,
} from "@phading/play_activity_service_interface/service";
import {
  K8S_SERVICE_NAME as PLAY_ACTIVITY_SERVICE_NAME,
  K8S_SERVICE_PORT as PLAY_ACTIVITY_SERVICE_PORT,
} from "@phading/play_activity_service_interface/service_const";
import {
  PRODUCT_NODE_SERVICE,
  PRODUCT_WEB_SERVICE,
} from "@phading/product_service_interface/service";
import {
  K8S_SERVICE_NAME as PRODUCT_SERVICE_NAME,
  K8S_SERVICE_PORT as PRODUCT_SERVICE_PORT,
} from "@phading/product_service_interface/service_const";
import {
  USER_NODE_SERVICE,
  USER_WEB_SERVICE,
} from "@phading/user_service_interface/service";
import {
  K8S_SERVICE_NAME as USER_SERVICE_NAME,
  K8S_SERVICE_PORT as USER_SERVICE_PORT,
} from "@phading/user_service_interface/service_const";
import {
  USER_SESSION_NODE_SERVICE,
  USER_SESSION_WEB_SERVICE,
} from "@phading/user_session_service_interface/service";
import {
  K8S_SERVICE_NAME as USER_SESSION_SERVICE_NAME,
  K8S_SERVICE_PORT as USER_SESSION_SERVICE_PORT,
} from "@phading/user_session_service_interface/service_const";
import { VIDEO_NODE_SERVICE } from "@phading/video_service_interface/service";
import {
  K8S_SERVICE_NAME as VIDEO_SERVICE_NAME,
  K8S_SERVICE_PORT as VIDEO_SERVICE_PORT,
} from "@phading/video_service_interface/service_const";
import {
  K8S_SERVICE_NAME as WEB_UI_SERVICE_NAME,
  K8S_SERVICE_PORT as WEB_UI_SERVICE_NODE,
} from "@phading/web_interface/service_const";
import { writeFileSync } from "fs";

function addService(
  webServices: Map<string, [string, number]>,
  servicePath: string,
  serviceName: string,
  servicePort: number,
) {
  if (webServices.has(servicePath)) {
    throw new Error(
      `Duplicate service path of ${servicePath} for service ${serviceName}`,
    );
  }
  webServices.set(servicePath, [serviceName, servicePort]);
}

function generateIngressPath(entry: [string, [string, number]]) {
  return `
      - path: ${entry[0]}
        pathType: Prefix
        backend:
          service:
            name: ${entry[1][0]}
            port:
              number: ${entry[1][1]}`;
}

export function generate(env: string) {
  let cloudbuildTemplate = `steps:
- name: 'gcr.io/cloud-builders/kubectl'
  args: ['apply', '-f', '${env}/ingress.yaml']
  env:
    - 'CLOUDSDK_CONTAINER_CLUSTER=${ENV_VARS.clusterName}'
    - 'CLOUDSDK_COMPUTE_REGION=${ENV_VARS.clusterRegion}'
options:
  logging: CLOUD_LOGGING_ONLY
`;
  writeFileSync(`${env}/cloudbuild.yaml`, cloudbuildTemplate);

  let webServices = new Map<string, [string, number]>(); // [service path, [service name, service port]]
  let nodeServices = new Map<string, [string, number]>(); // [service path, [service name, service port]]

  addService(
    webServices,
    COMMENT_WEB_SERVICE.path,
    COMMENT_SERVICE_NAME,
    COMMENT_SERVICE_PORT,
  );

  addService(
    webServices,
    COMMERCE_WEB_SERVICE.path,
    COMMERCE_SERVICE_NAME,
    COMMERCE_SERVICE_PORT,
  );
  addService(
    nodeServices,
    COMMERCE_NODE_SERVICE.path,
    COMMERCE_SERVICE_NAME,
    COMMERCE_SERVICE_PORT,
  );

  addService(
    webServices,
    METER_WEB_SERVICE.path,
    METER_SERVICE_NAME,
    METER_SERVICE_PORT,
  );
  addService(
    nodeServices,
    METER_NODE_SERVICE.path,
    METER_SERVICE_NAME,
    METER_SERVICE_PORT,
  );

  addService(
    webServices,
    PLAY_ACTIVITY_WEB_SERVICE.path,
    PLAY_ACTIVITY_SERVICE_NAME,
    PLAY_ACTIVITY_SERVICE_PORT,
  );
  addService(
    nodeServices,
    PLAY_ACTIVITY_NODE_SERVICE.path,
    PLAY_ACTIVITY_SERVICE_NAME,
    PLAY_ACTIVITY_SERVICE_PORT,
  );

  addService(
    webServices,
    PRODUCT_WEB_SERVICE.path,
    PRODUCT_SERVICE_NAME,
    PRODUCT_SERVICE_PORT,
  );
  addService(
    nodeServices,
    PRODUCT_NODE_SERVICE.path,
    PRODUCT_SERVICE_NAME,
    PRODUCT_SERVICE_PORT,
  );

  addService(
    webServices,
    USER_WEB_SERVICE.path,
    USER_SERVICE_NAME,
    USER_SERVICE_PORT,
  );
  addService(
    nodeServices,
    USER_NODE_SERVICE.path,
    USER_SERVICE_NAME,
    USER_SERVICE_PORT,
  );

  addService(
    webServices,
    USER_SESSION_WEB_SERVICE.path,
    USER_SESSION_SERVICE_NAME,
    USER_SESSION_SERVICE_PORT,
  );
  addService(
    nodeServices,
    USER_SESSION_NODE_SERVICE.path,
    USER_SESSION_SERVICE_NAME,
    USER_SESSION_SERVICE_PORT,
  );

  addService(
    nodeServices,
    VIDEO_NODE_SERVICE.path,
    VIDEO_SERVICE_NAME,
    VIDEO_SERVICE_PORT,
  );

  // Assumes the web UI is served at the root path "/".
  addService(webServices, "/", WEB_UI_SERVICE_NAME, WEB_UI_SERVICE_NODE);

  let ingressTemplate = `apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: phading-certificate
spec:
  domains:
    - ${ENV_VARS.externalDomain}
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: phading-ingress-external
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "${ENV_VARS.clusterExternalIpName}"
    networking.gke.io/managed-certificates: "phading-certificate"
spec:
  rules:
  - http:
      paths:${Array.from(webServices).map(generateIngressPath).join("")}
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: phading-ingress-internal
  annotations:
    kubernetes.io/ingress.class: "gce-internal"
    kubernetes.io/ingress.regional-static-ip-name: "${ENV_VARS.clusterInternalIpName}"
spec:
  rules:
  - http:
      paths:${Array.from(nodeServices).map(generateIngressPath).join("")}
`;
  writeFileSync(`${env}/ingress.yaml`, ingressTemplate);
}

import "./dev/env";
generate("dev");
