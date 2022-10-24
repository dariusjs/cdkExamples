import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class EksTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const cluster = new cdk.aws_eks.Cluster(this, 'HelloEKS', {
      clusterName: 'test',
      version: cdk.aws_eks.KubernetesVersion.V1_21,
      defaultCapacity: 0,
    });
    cdk.Tags.of(cluster).add(`auto-stop`, 'no');
    cdk.Tags.of(cluster).add(`auto-delete`, 'no');

    const onDemandNg = cluster.addNodegroupCapacity('on-demand-node-group', {
      instanceTypes: [
        new cdk.aws_ec2.InstanceType('t3.medium'),
        new cdk.aws_ec2.InstanceType('t3a.medium'),
        new cdk.aws_ec2.InstanceType('m5.large'),
        new cdk.aws_ec2.InstanceType('m5a.large'),
        new cdk.aws_ec2.InstanceType('c5.large'),
        new cdk.aws_ec2.InstanceType('c5a.large'),
      ],
      minSize: 1,
      desiredSize: 1,
      maxSize: 1,
      diskSize: 100,
      amiType: cdk.aws_eks.NodegroupAmiType.AL2_X86_64,
    });

    const spotNg = cluster.addNodegroupCapacity('spot-node-group', {
      instanceTypes: [
        new cdk.aws_ec2.InstanceType('t3.medium'),
        new cdk.aws_ec2.InstanceType('t3a.medium'),
        new cdk.aws_ec2.InstanceType('m5.large'),
        new cdk.aws_ec2.InstanceType('m5a.large'),
        new cdk.aws_ec2.InstanceType('c5.large'),
        new cdk.aws_ec2.InstanceType('c5a.large'),
      ],
      minSize: 1,
      desiredSize: 1,
      maxSize: 1,
      diskSize: 100,
      amiType: cdk.aws_eks.NodegroupAmiType.AL2_X86_64,
      capacityType: cdk.aws_eks.CapacityType.SPOT,
    });

    cdk.Tags.of(onDemandNg).add(`k8s.io/cluster-autoscaler/enabled`, 'true');
    cdk.Tags.of(onDemandNg).add('k8s.io/cluster-autoscaler/test', 'true');
    cdk.Tags.of(onDemandNg).add(`auto-stop`, 'no');
    cdk.Tags.of(onDemandNg).add(`auto-delete`, 'no');
    cdk.Tags.of(spotNg).add(`k8s.io/cluster-autoscaler/enabled`, 'true');
    cdk.Tags.of(spotNg).add('k8s.io/cluster-autoscaler/test', 'true');
    cdk.Tags.of(spotNg).add(`auto-stop`, 'no');
    cdk.Tags.of(spotNg).add(`auto-delete`, 'no');

    cluster.addManifest('pod', {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: 'hello',
        labels: {
          app: 'hello',
        },
      },
      spec: {
        replicas: 3,
        selector: {
          matchLabels: {
            app: 'hello',
          },
        },
        template: {
          metadata: {
            labels: {
              app: 'hello',
            },
            annotations: {
              'prometheus.io/scrape': 'true',
              'prometheus.io/port': '8080',
            },
          },
          spec: {
            containers: [
              {
                name: 'hello-kubernetes',
                image: 'paulbouwer/hello-kubernetes:1.5',
                ports: [{ containerPort: 8080 }],
                resources: {
                  requests: {
                    cpu: '250m',
                    memory: '256Mi',
                  },
                  limits: {
                    cpu: '250m',
                    memory: '512Mi',
                  },
                },
              },
            ],
          },
        },
      },
    });

    const importedRole = cdk.aws_iam.Role.fromRoleArn(
      this,
      'imported-role',
      `arn:aws:iam::${cdk.Stack.of(this).account}:role/administrator`,
      { mutable: false },
    );

    cluster.awsAuth.addRoleMapping(importedRole, {
      groups: ['system:masters'],
    });

    new cdk.aws_eks.KubernetesManifest(this, 'cluster-autoscaler', {
      cluster,
      manifest: [
        {
          apiVersion: 'v1',
          kind: 'ServiceAccount',
          metadata: {
            name: 'cluster-autoscaler',
            namespace: 'kube-system',
            labels: {
              'k8s-addon': 'cluster-autoscaler.addons.k8s.io',
              'k8s-app': 'cluster-autoscaler',
            },
          },
        },
        {
          apiVersion: 'rbac.authorization.k8s.io/v1',
          kind: 'ClusterRole',
          metadata: {
            name: 'cluster-autoscaler',
            namespace: 'kube-system',
            labels: {
              'k8s-addon': 'cluster-autoscaler.addons.k8s.io',
              'k8s-app': 'cluster-autoscaler',
            },
          },
          rules: [
            {
              apiGroups: [''],
              resources: ['events', 'endpoints'],
              verbs: ['create', 'patch'],
            },
            {
              apiGroups: [''],
              resources: ['pods/eviction'],
              verbs: ['create'],
            },
            {
              apiGroups: [''],
              resources: ['pods/status'],
              verbs: ['update'],
            },
            {
              apiGroups: [''],
              resources: ['endpoints'],
              resourceNames: ['cluster-autoscaler'],
              verbs: ['get', 'update'],
            },
            {
              apiGroups: ['coordination.k8s.io'],
              resources: ['leases'],
              verbs: ['watch', 'list', 'get', 'patch', 'create', 'update'],
            },
            {
              apiGroups: [''],
              resources: ['nodes'],
              verbs: ['watch', 'list', 'get', 'update'],
            },
            {
              apiGroups: [''],
              resources: [
                'pods',
                'services',
                'replicationcontrollers',
                'persistentvolumeclaims',
                'persistentvolumes',
              ],
              verbs: ['watch', 'list', 'get'],
            },
            {
              apiGroups: ['extensions'],
              resources: ['replicasets', 'daemonsets'],
              verbs: ['watch', 'list', 'get'],
            },
            {
              apiGroups: ['policy'],
              resources: ['poddisruptionbudgets'],
              verbs: ['watch', 'list'],
            },
            {
              apiGroups: ['apps'],
              resources: ['statefulsets', 'replicasets', 'daemonsets'],
              verbs: ['watch', 'list', 'get'],
            },
            {
              apiGroups: ['storage.k8s.io'],
              resources: ['storageclasses', 'csinodes'],
              verbs: ['watch', 'list', 'get'],
            },
            {
              apiGroups: ['batch', 'extensions'],
              resources: ['jobs'],
              verbs: ['get', 'list', 'watch', 'patch'],
            },
          ],
        },
        {
          apiVersion: 'rbac.authorization.k8s.io/v1',
          kind: 'Role',
          metadata: {
            name: 'cluster-autoscaler',
            namespace: 'kube-system',
            labels: {
              'k8s-addon': 'cluster-autoscaler.addons.k8s.io',
              'k8s-app': 'cluster-autoscaler',
            },
          },
          rules: [
            {
              apiGroups: [''],
              resources: ['configmaps'],
              verbs: ['create', 'list', 'watch'],
            },
            {
              apiGroups: [''],
              resources: ['configmaps'],
              resourceNames: [
                'cluster-autoscaler-status',
                'cluster-autoscaler-priority-expander',
              ],
              verbs: ['delete', 'get', 'update', 'watch'],
            },
          ],
        },
        {
          apiVersion: 'rbac.authorization.k8s.io/v1',
          kind: 'ClusterRoleBinding',
          metadata: {
            name: 'cluster-autoscaler',
            namespace: 'kube-system',
            labels: {
              'k8s-addon': 'cluster-autoscaler.addons.k8s.io',
              'k8s-app': 'cluster-autoscaler',
            },
          },
          roleRef: {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'ClusterRole',
            name: 'cluster-autoscaler',
          },
          subjects: [
            {
              kind: 'ServiceAccount',
              name: 'cluster-autoscaler',
              namespace: 'kube-system',
            },
          ],
        },
        {
          apiVersion: 'rbac.authorization.k8s.io/v1',
          kind: 'RoleBinding',
          metadata: {
            name: 'cluster-autoscaler',
            namespace: 'kube-system',
            labels: {
              'k8s-addon': 'cluster-autoscaler.addons.k8s.io',
              'k8s-app': 'cluster-autoscaler',
            },
          },
          roleRef: {
            apiGroup: 'rbac.authorization.k8s.io',
            kind: 'Role',
            name: 'cluster-autoscaler',
          },
          subjects: [
            {
              kind: 'ServiceAccount',
              name: 'cluster-autoscaler',
              namespace: 'kube-system',
            },
          ],
        },
        {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          metadata: {
            name: 'cluster-autoscaler',
            namespace: 'kube-system',
            labels: {
              app: 'cluster-autoscaler',
            },
            annotations: {
              'cluster-autoscaler.kubernetes.io/safe-to-evict': 'false',
            },
          },
          spec: {
            replicas: 1,
            selector: {
              matchLabels: {
                app: 'cluster-autoscaler',
              },
            },
            template: {
              metadata: {
                labels: {
                  app: 'cluster-autoscaler',
                },
                annotations: {
                  'prometheus.io/scrape': 'true',
                  'prometheus.io/port': '8085',
                },
              },
              spec: {
                serviceAccountName: 'cluster-autoscaler',
                containers: [
                  {
                    image: 'k8s.gcr.io/autoscaling/cluster-autoscaler:v1.17.3',
                    name: 'cluster-autoscaler',
                    resources: {
                      limits: {
                        cpu: '100m',
                        memory: '300Mi',
                      },
                      requests: {
                        cpu: '100m',
                        memory: '300Mi',
                      },
                    },
                    command: [
                      './cluster-autoscaler',
                      '--v=4',
                      '--stderrthreshold=info',
                      '--cloud-provider=aws',
                      '--skip-nodes-with-local-storage=false',
                      '--expander=least-waste',
                      '--node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/' +
                        cluster.clusterName,
                      '--balance-similar-node-groups',
                      '--skip-nodes-with-system-pods=false',
                    ],
                    volumeMounts: [
                      {
                        name: 'ssl-certs',
                        mountPath: '/etc/ssl/certs/ca-certificates.crt',
                        readOnly: true,
                      },
                    ],
                    imagePullPolicy: 'Always',
                  },
                ],
                volumes: [
                  {
                    name: 'ssl-certs',
                    hostPath: {
                      path: '/etc/ssl/certs/ca-bundle.crt',
                    },
                  },
                ],
              },
            },
          },
        },
      ],
    });
  }
}
