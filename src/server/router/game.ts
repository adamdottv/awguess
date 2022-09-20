import { createRouter } from "./context"
import { z } from "zod"
import { Resource } from "."
import { PrismaClient } from "@prisma/client"

function getRandomItem<T>(array: T[]) {
  return array[Math.floor(Math.random() * array.length)] as T
}

async function createRound(prisma: PrismaClient, gameId: string) {
  const first = getRandomItem(resources)
  const second = getRandomItem(resources.filter((r) => r.name !== first.name))
  const third = getRandomItem(
    resources.filter((r) => r.name !== first.name && r.name !== second.name)
  )
  const fourth = getRandomItem(
    resources.filter(
      (r) =>
        r.name !== first.name && r.name !== second.name && r.name !== third.name
    )
  )
  const choices = [first, second, third, fourth]
  const answer = getRandomItem(choices)

  const expires = new Date()
  expires.setSeconds(expires.getSeconds() + 10)

  const round = await prisma.round.create({
    data: { gameId: gameId, answer: answer.name, expires },
  })
  return {
    ...round,
    answer: {
      image: answer.image.hashed,
    },
    choices: choices.map((choice) => ({
      ...choice,
      image: choice.image.original,
    })),
  }
}

export const gameRouter = createRouter()
  .mutation("new", {
    input: z.object({
      name: z.string().min(1),
    }),
    async resolve({ ctx, input }) {
      const game = await ctx.prisma.game.create({
        data: { name: input.name, score: 0 },
      })
      return game
    },
  })
  .mutation("start", {
    input: z.object({
      gameId: z.string().min(1),
    }),
    async resolve({ ctx, input }) {
      const round = await createRound(ctx.prisma, input.gameId)
      return round
    },
  })
  .mutation("answer", {
    input: z.object({
      roundId: z.string().min(1),
      choice: z.string().min(1),
    }),
    async resolve({ ctx, input }) {
      const { roundId, choice } = input
      const round = await ctx.prisma.round.findUnique({
        where: { id: roundId },
      })
      if (!round) throw new Error("Couldn't find round")

      const next = await createRound(ctx.prisma, round.gameId)

      const { answer, expires } = round
      const expired = expires < new Date()
      const correct = round.answer === choice

      return {
        correct,
        answer,
        next,
        expired,
      }
    },
  })

const resources: Resource[] = [
  {
    name: "Api Gateway",
    image: {
      hashed: "/images/hashed/a2d22e2c4150e66b726a05729eadd72e.svg",
      original: "/images/original/amazon-api-gateway.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Appflow",
    image: {
      hashed: "/images/hashed/8cdb740f6e254bb6291f1bf6b2151ac6.svg",
      original: "/images/original/amazon-appflow.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Application Auto Scaling",
    image: {
      hashed: "/images/hashed/6a844e0f65bcc55e15b35ed4730a5dbd.svg",
      original: "/images/original/amazon-application-auto-scaling.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Appstream",
    image: {
      hashed: "/images/hashed/eed11bd45394a60cfc73aa18bdabf850.svg",
      original: "/images/original/amazon-appstream.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Athena",
    image: {
      hashed: "/images/hashed/b2b102a76b7ad3f01419bf7c97528b8a.svg",
      original: "/images/original/amazon-athena.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Augmented Ai A2i",
    image: {
      hashed: "/images/hashed/adc4dc373cf52a67fcaac7edba258d12.svg",
      original: "/images/original/amazon-augmented-ai-a2i.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Aurora",
    image: {
      hashed: "/images/hashed/cc7616a4d0d477e83168fc663633bbb8.svg",
      original: "/images/original/amazon-aurora.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Braket",
    image: {
      hashed: "/images/hashed/56187d5311de20d4d523fbb6e9fa6a61.svg",
      original: "/images/original/amazon-braket.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Chime Sdk",
    image: {
      hashed: "/images/hashed/e82d0cca8f04bd734ec34115c832b42e.svg",
      original: "/images/original/amazon-chime-sdk.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Chime Voice Connector",
    image: {
      hashed: "/images/hashed/e61ff7b4e724beb3199633266ec16601.svg",
      original: "/images/original/amazon-chime-voice-connector.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Chime",
    image: {
      hashed: "/images/hashed/e31b480baf36e02043f43edc69a309ac.svg",
      original: "/images/original/amazon-chime.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Cloud Directory",
    image: {
      hashed: "/images/hashed/9d60de9ca8a1e4236f7bc3db42c8b186.svg",
      original: "/images/original/amazon-cloud-directory.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Cloudfront",
    image: {
      hashed: "/images/hashed/b42d6a3e37b6490b903a1fea31a2511f.svg",
      original: "/images/original/amazon-cloudfront.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Cloudsearch",
    image: {
      hashed: "/images/hashed/2b580a7df0558e43f392c9cc2e81e1d5.svg",
      original: "/images/original/amazon-cloudsearch.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Cloudwatch",
    image: {
      hashed: "/images/hashed/f7e82b080a99c73d2ad779a38566130e.svg",
      original: "/images/original/amazon-cloudwatch.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Codeguru",
    image: {
      hashed: "/images/hashed/7c3898b57fb7b6ae3b2d00562dba51f0.svg",
      original: "/images/original/amazon-codeguru.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Codewhisperer",
    image: {
      hashed: "/images/hashed/69992fec487e64883893624bbb6e3d38.svg",
      original: "/images/original/amazon-codewhisperer.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Cognito",
    image: {
      hashed: "/images/hashed/2cc0644370df4830cf05955773ac71f5.svg",
      original: "/images/original/amazon-cognito.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Comprehend Medical",
    image: {
      hashed: "/images/hashed/6e6ca0b2fde93bfef435ff5514590079.svg",
      original: "/images/original/amazon-comprehend-medical.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Comprehend",
    image: {
      hashed: "/images/hashed/7e5bc134b5e5ac0e26c16c64222801b7.svg",
      original: "/images/original/amazon-comprehend.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Connect",
    image: {
      hashed: "/images/hashed/06692b99efe3c054dcb87333b5f59d3a.svg",
      original: "/images/original/amazon-connect.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Corretto",
    image: {
      hashed: "/images/hashed/a0c3454a229ec1f8349cace739698d9a.svg",
      original: "/images/original/amazon-corretto.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Detective",
    image: {
      hashed: "/images/hashed/51f1bc6cbc54eee82d96bbc52b449cf7.svg",
      original: "/images/original/amazon-detective.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Devops Guru",
    image: {
      hashed: "/images/hashed/12f76a35a31ba351ddce9200f9a76fee.svg",
      original: "/images/original/amazon-devops-guru.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Documentdb",
    image: {
      hashed: "/images/hashed/c98daee0c3869899549b4f858320da6f.svg",
      original: "/images/original/amazon-documentdb.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Dynamodb",
    image: {
      hashed: "/images/hashed/4244099206461632e27d360c85cf87bc.svg",
      original: "/images/original/amazon-dynamodb.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Ec2 Auto Scaling",
    image: {
      hashed: "/images/hashed/6f77756e77dea84e813989a2007e9304.svg",
      original: "/images/original/amazon-ec2-auto-scaling.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Ec2 Image Builder",
    image: {
      hashed: "/images/hashed/f9d84cc9539d8f09db74373f982c1722.svg",
      original: "/images/original/amazon-ec2-image-builder.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Ec2",
    image: {
      hashed: "/images/hashed/88f86475453c1640b2bb8019e6b67a69.svg",
      original: "/images/original/amazon-ec2.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Ecs Anywhere",
    image: {
      hashed: "/images/hashed/8cba13c8e445c2c4f687d4b7368af66a.svg",
      original: "/images/original/amazon-ecs-anywhere.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Efs",
    image: {
      hashed: "/images/hashed/b484654c4b3227c374e368a8531f5ada.svg",
      original: "/images/original/amazon-efs.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Eks Anywhere",
    image: {
      hashed: "/images/hashed/03aed8219bbe7f2708d16896b8fae39e.svg",
      original: "/images/original/amazon-eks-anywhere.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Eks Cloud",
    image: {
      hashed: "/images/hashed/4c6c110590f6d9665b9e885f26a0ed85.svg",
      original: "/images/original/amazon-eks-cloud.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Eks Distro",
    image: {
      hashed: "/images/hashed/fd6dceb4f72295ec8a8336f57bacad89.svg",
      original: "/images/original/amazon-eks-distro.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Elastic Block Store",
    image: {
      hashed: "/images/hashed/7cb20c92398825de3903f7549781f4ca.svg",
      original: "/images/original/amazon-elastic-block-store.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Elastic Container Registry",
    image: {
      hashed: "/images/hashed/f802ef6f2ee80a540c5237189958a181.svg",
      original: "/images/original/amazon-elastic-container-registry.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Elastic Container Service",
    image: {
      hashed: "/images/hashed/b2c47a6a2cf4a21b4c78fd9ef1debf05.svg",
      original: "/images/original/amazon-elastic-container-service.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Elastic Inference",
    image: {
      hashed: "/images/hashed/42d5b9f543d860990518bb60dfe8cb51.svg",
      original: "/images/original/amazon-elastic-inference.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Elastic Kubernetes Service",
    image: {
      hashed: "/images/hashed/e85bd38ed147da54fde52f26b61624ee.svg",
      original: "/images/original/amazon-elastic-kubernetes-service.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Elastic Transcoder",
    image: {
      hashed: "/images/hashed/412b0684dee8dcd8dd11a96b880b67b6.svg",
      original: "/images/original/amazon-elastic-transcoder.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Elasticache",
    image: {
      hashed: "/images/hashed/d76711f15b0ce094ffeeea0a715ab5b0.svg",
      original: "/images/original/amazon-elasticache.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Emr",
    image: {
      hashed: "/images/hashed/1f2c56301a6c82a637a9994d5beabc9e.svg",
      original: "/images/original/amazon-emr.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Eventbridge",
    image: {
      hashed: "/images/hashed/e252aca682999e38c4ee3931b8a53cdd.svg",
      original: "/images/original/amazon-eventbridge.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Finspace",
    image: {
      hashed: "/images/hashed/c25c51743f2f884891aa54118292b2ba.svg",
      original: "/images/original/amazon-finspace.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Forecast",
    image: {
      hashed: "/images/hashed/2072691d5529e1ddfb37a6614fa249bc.svg",
      original: "/images/original/amazon-forecast.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Fraud Detector",
    image: {
      hashed: "/images/hashed/d5eec6f0833395181d21c5051a81cc42.svg",
      original: "/images/original/amazon-fraud-detector.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Fsx For Lustre",
    image: {
      hashed: "/images/hashed/6d2466263d2911092fad144d148c905e.svg",
      original: "/images/original/amazon-fsx-for-lustre.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Fsx For Netapp Ontap",
    image: {
      hashed: "/images/hashed/8f8b8c59549473a2c7e89026b48302e5.svg",
      original: "/images/original/amazon-fsx-for-netapp-ontap.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Fsx For Openzfs",
    image: {
      hashed: "/images/hashed/622bc133010e7688c2872e02147a30bb.svg",
      original: "/images/original/amazon-fsx-for-openzfs.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Fsx For Wfs",
    image: {
      hashed: "/images/hashed/34c479fe26ccbe1040a105a95b83eba3.svg",
      original: "/images/original/amazon-fsx-for-wfs.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Fsx",
    image: {
      hashed: "/images/hashed/b03d4e75244e2b9eb7f79fc60f0c6433.svg",
      original: "/images/original/amazon-fsx.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Gamelift",
    image: {
      hashed: "/images/hashed/22b0c153cd645cb9082d96f170b49ee5.svg",
      original: "/images/original/amazon-gamelift.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Gamesparks",
    image: {
      hashed: "/images/hashed/1b0f3a095bc0a7a0aa29d8b2b8450f8d.svg",
      original: "/images/original/amazon-gamesparks.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Genomics Cli",
    image: {
      hashed: "/images/hashed/a3e89cc14b3ba7b9ab6ac19a261c747c.svg",
      original: "/images/original/amazon-genomics-cli.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Guardduty",
    image: {
      hashed: "/images/hashed/ef30e5a70b655590a8253ef02e49ed1d.svg",
      original: "/images/original/amazon-guardduty.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Healthlake",
    image: {
      hashed: "/images/hashed/f56c9503571da16034f9a3a28d529528.svg",
      original: "/images/original/amazon-healthlake.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Honeycode",
    image: {
      hashed: "/images/hashed/831f8fb0315131dd7a988ceb87662486.svg",
      original: "/images/original/amazon-honeycode.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Inspector",
    image: {
      hashed: "/images/hashed/03bd96568df8ef60a88369fe8a5da70c.svg",
      original: "/images/original/amazon-inspector.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Interactive Video Service",
    image: {
      hashed: "/images/hashed/854bc1220e713611f054c5608c0e71cd.svg",
      original: "/images/original/amazon-interactive-video-service.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Kendra",
    image: {
      hashed: "/images/hashed/35921533e64c692c31df674c725e5d07.svg",
      original: "/images/original/amazon-kendra.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Keyspaces",
    image: {
      hashed: "/images/hashed/18b2109cc06bd112fd48fb22be58252b.svg",
      original: "/images/original/amazon-keyspaces.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Kinesis Data Analytics",
    image: {
      hashed: "/images/hashed/f8cfb17a65a792a418df8d9ae0aa04d9.svg",
      original: "/images/original/amazon-kinesis-data-analytics.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Kinesis Data Streams",
    image: {
      hashed: "/images/hashed/7a70edc7aba938c15af6e1ec1023a591.svg",
      original: "/images/original/amazon-kinesis-data-streams.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Kinesis Firehose",
    image: {
      hashed: "/images/hashed/c87a19cdc7d271fb1ab191ed61266d7b.svg",
      original: "/images/original/amazon-kinesis-firehose.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Kinesis Video Streams",
    image: {
      hashed: "/images/hashed/a7b0fe0f0cb42d8eecfdf4f18250d122.svg",
      original: "/images/original/amazon-kinesis-video-streams.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Kinesis",
    image: {
      hashed: "/images/hashed/aea7e54af76bbc5618af4c234f2411b4.svg",
      original: "/images/original/amazon-kinesis.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Lex",
    image: {
      hashed: "/images/hashed/c502598b26512ec70ccd191a5d438cd0.svg",
      original: "/images/original/amazon-lex.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Lightsail",
    image: {
      hashed: "/images/hashed/1a7b70bb625da944999229eaf40d41df.svg",
      original: "/images/original/amazon-lightsail.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Location Service",
    image: {
      hashed: "/images/hashed/2a4d9bd0dbebfa1b3f9d4b24e54fb002.svg",
      original: "/images/original/amazon-location-service.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Lookout For Equipment",
    image: {
      hashed: "/images/hashed/f251966d26c343cb139dd6699a433d53.svg",
      original: "/images/original/amazon-lookout-for-equipment.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Lookout For Metrics",
    image: {
      hashed: "/images/hashed/aca159b69045dfee3553a9dc1a5d0be3.svg",
      original: "/images/original/amazon-lookout-for-metrics.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Lookout For Vision",
    image: {
      hashed: "/images/hashed/f571afd7649f9b07463214bc4ecb1876.svg",
      original: "/images/original/amazon-lookout-for-vision.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Lumberyard",
    image: {
      hashed: "/images/hashed/27937bd1a9394da90fed4d165c139293.svg",
      original: "/images/original/amazon-lumberyard.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Macie",
    image: {
      hashed: "/images/hashed/9d8a86d31e2f357645eaa385b96a593a.svg",
      original: "/images/original/amazon-macie.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Managed Blockchain",
    image: {
      hashed: "/images/hashed/44b60612a155218cd67205aa215ac8f7.svg",
      original: "/images/original/amazon-managed-blockchain.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Managed Grafana",
    image: {
      hashed: "/images/hashed/b8223e04cade4c536bc00f204bc1ec45.svg",
      original: "/images/original/amazon-managed-grafana.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Managed Service For Prometheus",
    image: {
      hashed: "/images/hashed/7063d2eebd6cacf4ad82e8f937f814b1.svg",
      original: "/images/original/amazon-managed-service-for-prometheus.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Managed Streaming For Apache Kafka",
    image: {
      hashed: "/images/hashed/c9a35919881133250a705408446ecbc0.svg",
      original:
        "/images/original/amazon-managed-streaming-for-apache-kafka.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Managed Workflows For Apache Airflow",
    image: {
      hashed: "/images/hashed/c59d34bc695d3062b289f60e3e904619.svg",
      original:
        "/images/original/amazon-managed-workflows-for-apache-airflow.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Memorydb For Redis",
    image: {
      hashed: "/images/hashed/45700bcb717d8212bf26f470d7a48eb5.svg",
      original: "/images/original/amazon-memorydb-for-redis.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Monitron",
    image: {
      hashed: "/images/hashed/c5da6a55ca0cecc7eacbae1d218aeb5e.svg",
      original: "/images/original/amazon-monitron.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Mq",
    image: {
      hashed: "/images/hashed/ed7b63e7f85eabf610bbe26b744b340c.svg",
      original: "/images/original/amazon-mq.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Neptune",
    image: {
      hashed: "/images/hashed/55beae00d4c1a0390cf1d0ab564bde06.svg",
      original: "/images/original/amazon-neptune.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Nimble Studio",
    image: {
      hashed: "/images/hashed/0fd0ecda65d76285c3d59b90c10a6fe7.svg",
      original: "/images/original/amazon-nimble-studio.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Opensearch Service",
    image: {
      hashed: "/images/hashed/ce5ed7cc626d8814533c46677ab16541.svg",
      original: "/images/original/amazon-opensearch-service.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Personalize",
    image: {
      hashed: "/images/hashed/e581c6aaf2de8d0903601b640eccfa52.svg",
      original: "/images/original/amazon-personalize.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Pinpoint Apis",
    image: {
      hashed: "/images/hashed/24b1ac393b7c7b5d3bb063831cc76825.svg",
      original: "/images/original/amazon-pinpoint-apis.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Pinpoint",
    image: {
      hashed: "/images/hashed/f84a31feebfd3ec96ba1892b483348b8.svg",
      original: "/images/original/amazon-pinpoint.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Polly",
    image: {
      hashed: "/images/hashed/13bf8409b27623eccf7d9ea8d8a7cafd.svg",
      original: "/images/original/amazon-polly.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Quantum Ledger Database",
    image: {
      hashed: "/images/hashed/d2462b64f379a37236c4a08581dc8ffc.svg",
      original: "/images/original/amazon-quantum-ledger-database.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Quicksight",
    image: {
      hashed: "/images/hashed/cf6f40bb1a1cab47bf5b319c8d48d689.svg",
      original: "/images/original/amazon-quicksight.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Rds On Vmware",
    image: {
      hashed: "/images/hashed/2b5b9d72b7d33dae0c3e7297d5c1fe8a.svg",
      original: "/images/original/amazon-rds-on-vmware.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Rds",
    image: {
      hashed: "/images/hashed/e4be729c89eea1cf99f9dc3da60cce8a.svg",
      original: "/images/original/amazon-rds.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Redshift",
    image: {
      hashed: "/images/hashed/d24391102c70936bb08e087973564d75.svg",
      original: "/images/original/amazon-redshift.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Rekognition",
    image: {
      hashed: "/images/hashed/b8bb56ac70a5f3af5e4f994bbafff8e8.svg",
      original: "/images/original/amazon-rekognition.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Route 53",
    image: {
      hashed: "/images/hashed/06b3b18910d6eec748cf3bf58df456b6.svg",
      original: "/images/original/amazon-route-53.svg",
    },
    prefix: "amazon",
  },
  {
    name: "S3 On Outposts",
    image: {
      hashed: "/images/hashed/9365951937c213d60fb73091bee1f09c.svg",
      original: "/images/original/amazon-s3-on-outposts.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Sagemaker Ground Truth",
    image: {
      hashed: "/images/hashed/0eff3e7fb9c854796b05a20a5a8aa522.svg",
      original: "/images/original/amazon-sagemaker-ground-truth.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Sagemaker Studio Lab",
    image: {
      hashed: "/images/hashed/5c515c60bab590e467d3bd635432650c.svg",
      original: "/images/original/amazon-sagemaker-studio-lab.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Sagemaker",
    image: {
      hashed: "/images/hashed/e122162e37ec3c19cd1fdcd95f5907d8.svg",
      original: "/images/original/amazon-sagemaker.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Simple Email Service",
    image: {
      hashed: "/images/hashed/0043d60cc00c6faf2594fc247131a958.svg",
      original: "/images/original/amazon-simple-email-service.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Simple Notification Service",
    image: {
      hashed: "/images/hashed/b61042e1895e44bff3645c0dd989d4ce.svg",
      original: "/images/original/amazon-simple-notification-service.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Simple Queue Service",
    image: {
      hashed: "/images/hashed/e7e1788430d229f86edf962c99e3073c.svg",
      original: "/images/original/amazon-simple-queue-service.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Simple Storage Service Glacier",
    image: {
      hashed: "/images/hashed/4c7007f59d4a54e5b076515d6df53507.svg",
      original: "/images/original/amazon-simple-storage-service-glacier.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Simple Storage Service",
    image: {
      hashed: "/images/hashed/9d3de965e5de96e9a30c8da28c5c1db1.svg",
      original: "/images/original/amazon-simple-storage-service.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Sumerian",
    image: {
      hashed: "/images/hashed/8ab7cb2e492d1cf7b6f2bc68772b6376.svg",
      original: "/images/original/amazon-sumerian.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Textract",
    image: {
      hashed: "/images/hashed/9ecdf1641cbecb9e70037334bf3fbd8c.svg",
      original: "/images/original/amazon-textract.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Timestream",
    image: {
      hashed: "/images/hashed/739238e1aa38df5d8b338de83de553d0.svg",
      original: "/images/original/amazon-timestream.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Transcribe",
    image: {
      hashed: "/images/hashed/19d995da787b7ab97b705933a9066af4.svg",
      original: "/images/original/amazon-transcribe.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Translate",
    image: {
      hashed: "/images/hashed/b560fac25a9286b6b3e5c643e71fd4b9.svg",
      original: "/images/original/amazon-translate.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Virtual Private Cloud",
    image: {
      hashed: "/images/hashed/3381124278c92c874952b07058672a21.svg",
      original: "/images/original/amazon-virtual-private-cloud.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Workdocs Sdk",
    image: {
      hashed: "/images/hashed/5432d3e75af2ac1625922dd8f1306159.svg",
      original: "/images/original/amazon-workdocs-sdk.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Workdocs",
    image: {
      hashed: "/images/hashed/9da8245680fa30a4eced92a987096326.svg",
      original: "/images/original/amazon-workdocs.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Worklink",
    image: {
      hashed: "/images/hashed/5a0781d29ccc2d78918d6e4c52fe453e.svg",
      original: "/images/original/amazon-worklink.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Workmail",
    image: {
      hashed: "/images/hashed/8c2565abcee59d68dce69ea475d44dbb.svg",
      original: "/images/original/amazon-workmail.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Workspaces Web",
    image: {
      hashed: "/images/hashed/972ae191b999640ee004aa2f2e4ce47d.svg",
      original: "/images/original/amazon-workspaces-web.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Workspaces",
    image: {
      hashed: "/images/hashed/6bcacf31df5f44bf9f275a5b255fe6b6.svg",
      original: "/images/original/amazon-workspaces.svg",
    },
    prefix: "amazon",
  },
  {
    name: "Activate",
    image: {
      hashed: "/images/hashed/1a3bb2add4057737bf892a35bf758362.svg",
      original: "/images/original/aws-activate.svg",
    },
    prefix: "aws",
  },
  {
    name: "Amplify",
    image: {
      hashed: "/images/hashed/05d8e2fc2adb8c19a1ee6bf764f4caa3.svg",
      original: "/images/original/aws-amplify.svg",
    },
    prefix: "aws",
  },
  {
    name: "App Mesh",
    image: {
      hashed: "/images/hashed/ac85cedd418481ab62e8e40a93d8aa5e.svg",
      original: "/images/original/aws-app-mesh.svg",
    },
    prefix: "aws",
  },
  {
    name: "App Runner",
    image: {
      hashed: "/images/hashed/41ae61bef7d8a9ea610931d5f34702fb.svg",
      original: "/images/original/aws-app-runner.svg",
    },
    prefix: "aws",
  },
  {
    name: "Appconfig",
    image: {
      hashed: "/images/hashed/c24d999e49b75adf4057659dc90d3a19.svg",
      original: "/images/original/aws-appconfig.svg",
    },
    prefix: "aws",
  },
  {
    name: "Application Auto Scaling",
    image: {
      hashed: "/images/hashed/4d75559bc05bfbf3d755b7d86d385ec3.svg",
      original: "/images/original/aws-application-auto-scaling.svg",
    },
    prefix: "aws",
  },
  {
    name: "Application Cost Profiler",
    image: {
      hashed: "/images/hashed/bd4b38ea9fd38098e566daf11a1ce929.svg",
      original: "/images/original/aws-application-cost-profiler.svg",
    },
    prefix: "aws",
  },
  {
    name: "Application Discovery Service",
    image: {
      hashed: "/images/hashed/145f88b1703d5f2aa94b220fbd96fd2e.svg",
      original: "/images/original/aws-application-discovery-service.svg",
    },
    prefix: "aws",
  },
  {
    name: "Application Migration Service",
    image: {
      hashed: "/images/hashed/33e17139982ee9b80c0b0ba0902661d0.svg",
      original: "/images/original/aws-application-migration-service.svg",
    },
    prefix: "aws",
  },
  {
    name: "Appsync",
    image: {
      hashed: "/images/hashed/0bd1f9e604ea718482f51e6a5bd13e7d.svg",
      original: "/images/original/aws-appsync.svg",
    },
    prefix: "aws",
  },
  {
    name: "Artifact",
    image: {
      hashed: "/images/hashed/4a19a4ff1dc064fbcf76d6c54b40465a.svg",
      original: "/images/original/aws-artifact.svg",
    },
    prefix: "aws",
  },
  {
    name: "Audit Manager",
    image: {
      hashed: "/images/hashed/686d03df4a91e253e1e3373fb6ad739f.svg",
      original: "/images/original/aws-audit-manager.svg",
    },
    prefix: "aws",
  },
  {
    name: "Auto Scaling",
    image: {
      hashed: "/images/hashed/dd67145890647e0cd02963ab0ba68a50.svg",
      original: "/images/original/aws-auto-scaling.svg",
    },
    prefix: "aws",
  },
  {
    name: "Backint Agent",
    image: {
      hashed: "/images/hashed/1f638791b32a2ebd76b4c2fb1c5df75f.svg",
      original: "/images/original/aws-backint-agent.svg",
    },
    prefix: "aws",
  },
  {
    name: "Backup",
    image: {
      hashed: "/images/hashed/d4901046ac2b52564a2656ca3f435fbc.svg",
      original: "/images/original/aws-backup.svg",
    },
    prefix: "aws",
  },
  {
    name: "Batch",
    image: {
      hashed: "/images/hashed/80f10f0124bdb038ba336cd69c583673.svg",
      original: "/images/original/aws-batch.svg",
    },
    prefix: "aws",
  },
  {
    name: "Billing Conductor",
    image: {
      hashed: "/images/hashed/799ce9b17d1eada9f8122512a8b68b04.svg",
      original: "/images/original/aws-billing-conductor.svg",
    },
    prefix: "aws",
  },
  {
    name: "Budgets",
    image: {
      hashed: "/images/hashed/175bf12495432b53e9d9fe54acbfa500.svg",
      original: "/images/original/aws-budgets.svg",
    },
    prefix: "aws",
  },
  {
    name: "Certificate Manager",
    image: {
      hashed: "/images/hashed/23e6ca479d714d0998c3e887d20a18d0.svg",
      original: "/images/original/aws-certificate-manager.svg",
    },
    prefix: "aws",
  },
  {
    name: "Chatbot",
    image: {
      hashed: "/images/hashed/44d647518f3849165aec52a637279a05.svg",
      original: "/images/original/aws-chatbot.svg",
    },
    prefix: "aws",
  },
  {
    name: "Client Vpn",
    image: {
      hashed: "/images/hashed/43106964ac05b05c1f63ec2b8944a23e.svg",
      original: "/images/original/aws-client-vpn.svg",
    },
    prefix: "aws",
  },
  {
    name: "Cloud Control Api",
    image: {
      hashed: "/images/hashed/3fd78b9eed95f69ed09a4b36caf43b6c.svg",
      original: "/images/original/aws-cloud-control-api.svg",
    },
    prefix: "aws",
  },
  {
    name: "Cloud Development Kit",
    image: {
      hashed: "/images/hashed/3323d6505ba3cc9b8b8bc405f049d5c1.svg",
      original: "/images/original/aws-cloud-development-kit.svg",
    },
    prefix: "aws",
  },
  {
    name: "Cloud Map",
    image: {
      hashed: "/images/hashed/b3b512e8a4d7d09a34f0786b8b5dd6af.svg",
      original: "/images/original/aws-cloud-map.svg",
    },
    prefix: "aws",
  },
  {
    name: "Cloud Wan",
    image: {
      hashed: "/images/hashed/d11e82601bccf710c102c73e7f11bfc2.svg",
      original: "/images/original/aws-cloud-wan.svg",
    },
    prefix: "aws",
  },
  {
    name: "Cloud9",
    image: {
      hashed: "/images/hashed/43bdc4c54e1be00cd1fbecca504199fc.svg",
      original: "/images/original/aws-cloud9.svg",
    },
    prefix: "aws",
  },
  {
    name: "Cloudformation",
    image: {
      hashed: "/images/hashed/d26a5d1af14b443c263ee1d373e45a56.svg",
      original: "/images/original/aws-cloudformation.svg",
    },
    prefix: "aws",
  },
  {
    name: "Cloudhsm",
    image: {
      hashed: "/images/hashed/12a48d1ecec932a95fb9801be10e698a.svg",
      original: "/images/original/aws-cloudhsm.svg",
    },
    prefix: "aws",
  },
  {
    name: "Cloudshell",
    image: {
      hashed: "/images/hashed/80c553710b8c639fbad8402f0bf77a0f.svg",
      original: "/images/original/aws-cloudshell.svg",
    },
    prefix: "aws",
  },
  {
    name: "Cloudtrail",
    image: {
      hashed: "/images/hashed/32b54e769eab33f8e4513a295eed0cbb.svg",
      original: "/images/original/aws-cloudtrail.svg",
    },
    prefix: "aws",
  },
  {
    name: "Codeartifact",
    image: {
      hashed: "/images/hashed/90cceb9283442b816e3542a024b6d651.svg",
      original: "/images/original/aws-codeartifact.svg",
    },
    prefix: "aws",
  },
  {
    name: "Codebuild",
    image: {
      hashed: "/images/hashed/d76a32b4f241386dfba9c454337841ab.svg",
      original: "/images/original/aws-codebuild.svg",
    },
    prefix: "aws",
  },
  {
    name: "Codecommit",
    image: {
      hashed: "/images/hashed/e371958d61652ebea4f9e054d023591b.svg",
      original: "/images/original/aws-codecommit.svg",
    },
    prefix: "aws",
  },
  {
    name: "Codedeploy",
    image: {
      hashed: "/images/hashed/7eabfedc3beebfece13ccdee1749c680.svg",
      original: "/images/original/aws-codedeploy.svg",
    },
    prefix: "aws",
  },
  {
    name: "Codepipeline",
    image: {
      hashed: "/images/hashed/2d2813a3d0ff71faf222470c7effed36.svg",
      original: "/images/original/aws-codepipeline.svg",
    },
    prefix: "aws",
  },
  {
    name: "Codestar",
    image: {
      hashed: "/images/hashed/4b7fde877284ec85457afd37e4da2191.svg",
      original: "/images/original/aws-codestar.svg",
    },
    prefix: "aws",
  },
  {
    name: "Command Line Interface",
    image: {
      hashed: "/images/hashed/7d127a2287babdaf02e8c33ab6100077.svg",
      original: "/images/original/aws-command-line-interface.svg",
    },
    prefix: "aws",
  },
  {
    name: "Compute Optimizer",
    image: {
      hashed: "/images/hashed/9b2e5019058cd7a0beeedec347dd36b2.svg",
      original: "/images/original/aws-compute-optimizer.svg",
    },
    prefix: "aws",
  },
  {
    name: "Config",
    image: {
      hashed: "/images/hashed/98f452a111feaba04ca079443492e051.svg",
      original: "/images/original/aws-config.svg",
    },
    prefix: "aws",
  },
  {
    name: "Console Mobile Application",
    image: {
      hashed: "/images/hashed/45d6175cbae7bf1c7c036b22eb8a41d9.svg",
      original: "/images/original/aws-console-mobile-application.svg",
    },
    prefix: "aws",
  },
  {
    name: "Control Tower",
    image: {
      hashed: "/images/hashed/1c86f78c5051cd41c5782dbfdfdf0880.svg",
      original: "/images/original/aws-control-tower.svg",
    },
    prefix: "aws",
  },
  {
    name: "Cost And Usage Report",
    image: {
      hashed: "/images/hashed/8ba2e0a759f5d6650d837ea163603c46.svg",
      original: "/images/original/aws-cost-and-usage-report.svg",
    },
    prefix: "aws",
  },
  {
    name: "Cost Explorer",
    image: {
      hashed: "/images/hashed/bea59a2d7ba3b33bf586ec333c9ab8c0.svg",
      original: "/images/original/aws-cost-explorer.svg",
    },
    prefix: "aws",
  },
  {
    name: "Data Exchange",
    image: {
      hashed: "/images/hashed/64dca75f42dc52b5da30a362b0f935e8.svg",
      original: "/images/original/aws-data-exchange.svg",
    },
    prefix: "aws",
  },
  {
    name: "Data Pipeline",
    image: {
      hashed: "/images/hashed/bcbaac048050f6a8fb8975c04c838c47.svg",
      original: "/images/original/aws-data-pipeline.svg",
    },
    prefix: "aws",
  },
  {
    name: "Database Migration Service",
    image: {
      hashed: "/images/hashed/cb8b325e871fed15d9e8a97f100603a9.svg",
      original: "/images/original/aws-database-migration-service.svg",
    },
    prefix: "aws",
  },
  {
    name: "Datasync",
    image: {
      hashed: "/images/hashed/323b7cb317ff40bd9ed94f7fa34217aa.svg",
      original: "/images/original/aws-datasync.svg",
    },
    prefix: "aws",
  },
  {
    name: "Deep Learning Amis",
    image: {
      hashed: "/images/hashed/40f8baca9192e643398d0a6d3b294555.svg",
      original: "/images/original/aws-deep-learning-amis.svg",
    },
    prefix: "aws",
  },
  {
    name: "Deep Learning Containers",
    image: {
      hashed: "/images/hashed/740d9310e1828c04fdf0ad9bedcafaac.svg",
      original: "/images/original/aws-deep-learning-containers.svg",
    },
    prefix: "aws",
  },
  {
    name: "Deepcomposer",
    image: {
      hashed: "/images/hashed/c6fbf72edac8a5ce846abf41deb0fbe2.svg",
      original: "/images/original/aws-deepcomposer.svg",
    },
    prefix: "aws",
  },
  {
    name: "Deeplens",
    image: {
      hashed: "/images/hashed/ac40c6510328cd0ec991f6b34be5a948.svg",
      original: "/images/original/aws-deeplens.svg",
    },
    prefix: "aws",
  },
  {
    name: "Deepracer",
    image: {
      hashed: "/images/hashed/67ff723a3b19fb92f224f569809928fb.svg",
      original: "/images/original/aws-deepracer.svg",
    },
    prefix: "aws",
  },
  {
    name: "Device Farm",
    image: {
      hashed: "/images/hashed/65f15c824f5ed9ccb0c04e0c53432041.svg",
      original: "/images/original/aws-device-farm.svg",
    },
    prefix: "aws",
  },
  {
    name: "Direct Connect",
    image: {
      hashed: "/images/hashed/1cf87b0e0ff0aa42ebbe832183656076.svg",
      original: "/images/original/aws-direct-connect.svg",
    },
    prefix: "aws",
  },
  {
    name: "Directory Service",
    image: {
      hashed: "/images/hashed/18225cc915775e3770933d362876aa89.svg",
      original: "/images/original/aws-directory-service.svg",
    },
    prefix: "aws",
  },
  {
    name: "Distro For Opentelemetry",
    image: {
      hashed: "/images/hashed/69641d418877ce61182e58456c7cc3ec.svg",
      original: "/images/original/aws-distro-for-opentelemetry.svg",
    },
    prefix: "aws",
  },
  {
    name: "Elastic Beanstalk",
    image: {
      hashed: "/images/hashed/3431234f3eeb4be8758c10267523c348.svg",
      original: "/images/original/aws-elastic-beanstalk.svg",
    },
    prefix: "aws",
  },
  {
    name: "Elemental Appliances & Software",
    image: {
      hashed: "/images/hashed/3b276ed737e3c58193dd6b2bf268deb9.svg",
      original: "/images/original/aws-elemental-appliances-&-software.svg",
    },
    prefix: "aws",
  },
  {
    name: "Elemental Conductor",
    image: {
      hashed: "/images/hashed/e927df9c64d6dbde52540863016e107d.svg",
      original: "/images/original/aws-elemental-conductor.svg",
    },
    prefix: "aws",
  },
  {
    name: "Elemental Delta",
    image: {
      hashed: "/images/hashed/efcc1f8cf35f507969a578c26b988eeb.svg",
      original: "/images/original/aws-elemental-delta.svg",
    },
    prefix: "aws",
  },
  {
    name: "Elemental Link",
    image: {
      hashed: "/images/hashed/567d54eda56b194bda57dc53cb560454.svg",
      original: "/images/original/aws-elemental-link.svg",
    },
    prefix: "aws",
  },
  {
    name: "Elemental Live",
    image: {
      hashed: "/images/hashed/21723366d46034db9f1410739ad725c2.svg",
      original: "/images/original/aws-elemental-live.svg",
    },
    prefix: "aws",
  },
  {
    name: "Elemental Mediaconnect",
    image: {
      hashed: "/images/hashed/10e964789c5cc7b0248ac1cf34364e1e.svg",
      original: "/images/original/aws-elemental-mediaconnect.svg",
    },
    prefix: "aws",
  },
  {
    name: "Elemental Mediaconvert",
    image: {
      hashed: "/images/hashed/b7381a991928523e64bcbc20c6b6a780.svg",
      original: "/images/original/aws-elemental-mediaconvert.svg",
    },
    prefix: "aws",
  },
  {
    name: "Elemental Medialive",
    image: {
      hashed: "/images/hashed/d8e809863a4726eb4375ba471ed415b9.svg",
      original: "/images/original/aws-elemental-medialive.svg",
    },
    prefix: "aws",
  },
  {
    name: "Elemental Mediapackage",
    image: {
      hashed: "/images/hashed/54ce30b66cb57d2dcf625519fd1265ea.svg",
      original: "/images/original/aws-elemental-mediapackage.svg",
    },
    prefix: "aws",
  },
  {
    name: "Elemental Mediastore",
    image: {
      hashed: "/images/hashed/ad2fc267ae1a178e353cbd746bb22bb8.svg",
      original: "/images/original/aws-elemental-mediastore.svg",
    },
    prefix: "aws",
  },
  {
    name: "Elemental Mediatailor",
    image: {
      hashed: "/images/hashed/002a4ccaea69face88e56c45dab1c236.svg",
      original: "/images/original/aws-elemental-mediatailor.svg",
    },
    prefix: "aws",
  },
  {
    name: "Elemental Server",
    image: {
      hashed: "/images/hashed/e61c6c427a181497ec3de78b1ad9438d.svg",
      original: "/images/original/aws-elemental-server.svg",
    },
    prefix: "aws",
  },
  {
    name: "Express Workflows",
    image: {
      hashed: "/images/hashed/405ed19e419c12e7370a462ba4fd8472.svg",
      original: "/images/original/aws-express-workflows.svg",
    },
    prefix: "aws",
  },
  {
    name: "Fargate",
    image: {
      hashed: "/images/hashed/055d257ef3005ce41b63b35f42c6f383.svg",
      original: "/images/original/aws-fargate.svg",
    },
    prefix: "aws",
  },
  {
    name: "Fault Injection Simulator",
    image: {
      hashed: "/images/hashed/22f3a0efa43ac44e87f37eed28cb7ac6.svg",
      original: "/images/original/aws-fault-injection-simulator.svg",
    },
    prefix: "aws",
  },
  {
    name: "Firewall Manager",
    image: {
      hashed: "/images/hashed/1e61bd91c39ecd6d069fc5118477000f.svg",
      original: "/images/original/aws-firewall-manager.svg",
    },
    prefix: "aws",
  },
  {
    name: "Gamekit",
    image: {
      hashed: "/images/hashed/164ef5f3f0a3b23435e9c9e7081cebc3.svg",
      original: "/images/original/aws-gamekit.svg",
    },
    prefix: "aws",
  },
  {
    name: "Global Accelerator",
    image: {
      hashed: "/images/hashed/80cc48c07ca623e3a56687e0319a6ca6.svg",
      original: "/images/original/aws-global-accelerator.svg",
    },
    prefix: "aws",
  },
  {
    name: "Glue Databrew",
    image: {
      hashed: "/images/hashed/75ff85de446ff7fa059b398288c9ad2b.svg",
      original: "/images/original/aws-glue-databrew.svg",
    },
    prefix: "aws",
  },
  {
    name: "Glue Elastic Views",
    image: {
      hashed: "/images/hashed/f0c5c9efd73fc12de592133fbcad2bf7.svg",
      original: "/images/original/aws-glue-elastic-views.svg",
    },
    prefix: "aws",
  },
  {
    name: "Glue",
    image: {
      hashed: "/images/hashed/c89c63b194bd1261670ef1ba2ebf0a01.svg",
      original: "/images/original/aws-glue.svg",
    },
    prefix: "aws",
  },
  {
    name: "Ground Station",
    image: {
      hashed: "/images/hashed/a813b3a992c12a871886b5ab1683e31a.svg",
      original: "/images/original/aws-ground-station.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iam Identity Center",
    image: {
      hashed: "/images/hashed/11f437924a92dcfe88bc246b6341f756.svg",
      original: "/images/original/aws-iam-identity-center.svg",
    },
    prefix: "aws",
  },
  {
    name: "Identity And Access Management",
    image: {
      hashed: "/images/hashed/69b8eb68b1dfec18f07b315c25298435.svg",
      original: "/images/original/aws-identity-and-access-management.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iot 1 Click",
    image: {
      hashed: "/images/hashed/341877e774abf680688796abd0353710.svg",
      original: "/images/original/aws-iot-1-click.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iot Analytics",
    image: {
      hashed: "/images/hashed/a1f897c7dd8e9636613daa24c84db3ac.svg",
      original: "/images/original/aws-iot-analytics.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iot Button",
    image: {
      hashed: "/images/hashed/834488b09f7ee4823e4f10945681d86f.svg",
      original: "/images/original/aws-iot-button.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iot Core",
    image: {
      hashed: "/images/hashed/45821815659add3363a547b00ef58fe8.svg",
      original: "/images/original/aws-iot-core.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iot Device Defender",
    image: {
      hashed: "/images/hashed/a1fc13e3d76689f366c8126339f47556.svg",
      original: "/images/original/aws-iot-device-defender.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iot Device Management",
    image: {
      hashed: "/images/hashed/1eb71d91cd3c131e29545aedf0159176.svg",
      original: "/images/original/aws-iot-device-management.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iot Edukit",
    image: {
      hashed: "/images/hashed/e00e1189fd00b0ed61b2276ee94c7d27.svg",
      original: "/images/original/aws-iot-edukit.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iot Events",
    image: {
      hashed: "/images/hashed/1b925337a72f88cc181ed37413920724.svg",
      original: "/images/original/aws-iot-events.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iot Expresslink",
    image: {
      hashed: "/images/hashed/5d8850f3b21f77d6c6a35628893fcdd7.svg",
      original: "/images/original/aws-iot-expresslink.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iot Fleetwise",
    image: {
      hashed: "/images/hashed/5345d61ee7849e4b5bb3729f7906355c.svg",
      original: "/images/original/aws-iot-fleetwise.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iot Greengrass",
    image: {
      hashed: "/images/hashed/4c555d6e42e13928f1327b9ec4e795c7.svg",
      original: "/images/original/aws-iot-greengrass.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iot Roborunner",
    image: {
      hashed: "/images/hashed/10df2f72e7ab27e9456aeb4b0a458c6e.svg",
      original: "/images/original/aws-iot-roborunner.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iot Sitewise",
    image: {
      hashed: "/images/hashed/8b9cabb78c34894294e92911a2922155.svg",
      original: "/images/original/aws-iot-sitewise.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iot Things Graph",
    image: {
      hashed: "/images/hashed/b34674ddbcb42d5fe2acae8467f812a5.svg",
      original: "/images/original/aws-iot-things-graph.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iot Twinmaker",
    image: {
      hashed: "/images/hashed/1779bb13d0d8f098504e6d87a837e338.svg",
      original: "/images/original/aws-iot-twinmaker.svg",
    },
    prefix: "aws",
  },
  {
    name: "Iq",
    image: {
      hashed: "/images/hashed/7d7d6b5844c1cd7288345bafa3f3a52b.svg",
      original: "/images/original/aws-iq.svg",
    },
    prefix: "aws",
  },
  {
    name: "Key Management Service",
    image: {
      hashed: "/images/hashed/6bc1635bb76d500049e9e183ea903d9a.svg",
      original: "/images/original/aws-key-management-service.svg",
    },
    prefix: "aws",
  },
  {
    name: "Lake Formation",
    image: {
      hashed: "/images/hashed/d5f0a4c381d1fd170b87292757a75490.svg",
      original: "/images/original/aws-lake-formation.svg",
    },
    prefix: "aws",
  },
  {
    name: "Lambda",
    image: {
      hashed: "/images/hashed/7b4ed052e208b38207dbd68588b61a4c.svg",
      original: "/images/original/aws-lambda.svg",
    },
    prefix: "aws",
  },
  {
    name: "Launch Wizard",
    image: {
      hashed: "/images/hashed/a1f219aab4ad0135be56c0e6dbce80fa.svg",
      original: "/images/original/aws-launch-wizard.svg",
    },
    prefix: "aws",
  },
  {
    name: "License Manager",
    image: {
      hashed: "/images/hashed/5be5739f8486d6db1dcaf25ee61ea27d.svg",
      original: "/images/original/aws-license-manager.svg",
    },
    prefix: "aws",
  },
  {
    name: "Local Zones",
    image: {
      hashed: "/images/hashed/ebc8c163b116b284dd416a3156e3b493.svg",
      original: "/images/original/aws-local-zones.svg",
    },
    prefix: "aws",
  },
  {
    name: "Mainframe Modernization",
    image: {
      hashed: "/images/hashed/35df0720b71a1a732f53d502b4048020.svg",
      original: "/images/original/aws-mainframe-modernization.svg",
    },
    prefix: "aws",
  },
  {
    name: "Managed Services",
    image: {
      hashed: "/images/hashed/95b7218541fe72ec626c279555169de8.svg",
      original: "/images/original/aws-managed-services.svg",
    },
    prefix: "aws",
  },
  {
    name: "Management Console",
    image: {
      hashed: "/images/hashed/a7edca28118ffd3113638b3c23a2aa5d.svg",
      original: "/images/original/aws-management-console.svg",
    },
    prefix: "aws",
  },
  {
    name: "Marketplace_dark",
    image: {
      hashed: "/images/hashed/a69bd65c6c0fb2b76aa1c57661ad630e.svg",
      original: "/images/original/aws-marketplace_dark.svg",
    },
    prefix: "aws",
  },
  {
    name: "Marketplace_light",
    image: {
      hashed: "/images/hashed/17cd22f39ea1e30bf8fe140ff14030da.svg",
      original: "/images/original/aws-marketplace_light.svg",
    },
    prefix: "aws",
  },
  {
    name: "Migration Evaluator",
    image: {
      hashed: "/images/hashed/a8b0b12de9bde5e315eebe2d0316ccea.svg",
      original: "/images/original/aws-migration-evaluator.svg",
    },
    prefix: "aws",
  },
  {
    name: "Migration Hub",
    image: {
      hashed: "/images/hashed/adfd5bae55a454b3174e3c7c92dea0bb.svg",
      original: "/images/original/aws-migration-hub.svg",
    },
    prefix: "aws",
  },
  {
    name: "Network Firewall",
    image: {
      hashed: "/images/hashed/0f63993b5b926e6909ac2d99072636ed.svg",
      original: "/images/original/aws-network-firewall.svg",
    },
    prefix: "aws",
  },
  {
    name: "Neuron",
    image: {
      hashed: "/images/hashed/f1a8369dc08cf432fdb9a6bd8c80d964.svg",
      original: "/images/original/aws-neuron.svg",
    },
    prefix: "aws",
  },
  {
    name: "Nitro Enclaves",
    image: {
      hashed: "/images/hashed/f4012dc19d00c308455e32ec1fca5614.svg",
      original: "/images/original/aws-nitro-enclaves.svg",
    },
    prefix: "aws",
  },
  {
    name: "Opsworks",
    image: {
      hashed: "/images/hashed/e8afa492d74cf51b180f9ff8e8fd4cd2.svg",
      original: "/images/original/aws-opsworks.svg",
    },
    prefix: "aws",
  },
  {
    name: "Organizations",
    image: {
      hashed: "/images/hashed/3f10d40a8fbfb733ef18e72e912c8f1b.svg",
      original: "/images/original/aws-organizations.svg",
    },
    prefix: "aws",
  },
  {
    name: "Outposts Family",
    image: {
      hashed: "/images/hashed/2dce0cd4351cd8c0eb29b82b98fb4d97.svg",
      original: "/images/original/aws-outposts-family.svg",
    },
    prefix: "aws",
  },
  {
    name: "Outposts Rack",
    image: {
      hashed: "/images/hashed/e5eb5f9b0c101b3f2f3f508c78910a69.svg",
      original: "/images/original/aws-outposts-rack.svg",
    },
    prefix: "aws",
  },
  {
    name: "Outposts Servers",
    image: {
      hashed: "/images/hashed/59aa6a2b33bd758c7e7b65369eb3bace.svg",
      original: "/images/original/aws-outposts-servers.svg",
    },
    prefix: "aws",
  },
  {
    name: "Panorama",
    image: {
      hashed: "/images/hashed/c2c39f2807e6afb27e8188b23eadfba5.svg",
      original: "/images/original/aws-panorama.svg",
    },
    prefix: "aws",
  },
  {
    name: "Parallelcluster",
    image: {
      hashed: "/images/hashed/5b39e4e0508edcdcf6bd2be8d82ade40.svg",
      original: "/images/original/aws-parallelcluster.svg",
    },
    prefix: "aws",
  },
  {
    name: "Personal Health Dashboard",
    image: {
      hashed: "/images/hashed/4e8a3e6028e5e6f14b5491b3240bf14d.svg",
      original: "/images/original/aws-personal-health-dashboard.svg",
    },
    prefix: "aws",
  },
  {
    name: "Private 5g",
    image: {
      hashed: "/images/hashed/5e9d79e4db938ba309d196f98f34d3e8.svg",
      original: "/images/original/aws-private-5g.svg",
    },
    prefix: "aws",
  },
  {
    name: "Privatelink",
    image: {
      hashed: "/images/hashed/df8662a77f0365dd25136267be706a4f.svg",
      original: "/images/original/aws-privatelink.svg",
    },
    prefix: "aws",
  },
  {
    name: "Professional Services",
    image: {
      hashed: "/images/hashed/abbdb4a84eb5b3cb136ff812ae87fc28.svg",
      original: "/images/original/aws-professional-services.svg",
    },
    prefix: "aws",
  },
  {
    name: "Proton",
    image: {
      hashed: "/images/hashed/254f120450a505f4b68b75cf2ea3d2b4.svg",
      original: "/images/original/aws-proton.svg",
    },
    prefix: "aws",
  },
  {
    name: "Repost",
    image: {
      hashed: "/images/hashed/0487e0b638d43455c0dae3953028c228.svg",
      original: "/images/original/aws-repost.svg",
    },
    prefix: "aws",
  },
  {
    name: "Resilience Hub",
    image: {
      hashed: "/images/hashed/62df44f4ab4cdaa7357d994aa6639542.svg",
      original: "/images/original/aws-resilience-hub.svg",
    },
    prefix: "aws",
  },
  {
    name: "Resource Access Manager",
    image: {
      hashed: "/images/hashed/3e36f6480a778fbc1ba73552d39f8a66.svg",
      original: "/images/original/aws-resource-access-manager.svg",
    },
    prefix: "aws",
  },
  {
    name: "Robomaker",
    image: {
      hashed: "/images/hashed/107ffd935e3809e515669732e645bffe.svg",
      original: "/images/original/aws-robomaker.svg",
    },
    prefix: "aws",
  },
  {
    name: "Secrets Manager",
    image: {
      hashed: "/images/hashed/3bd2acf7358a0b9308d995242ef47bb2.svg",
      original: "/images/original/aws-secrets-manager.svg",
    },
    prefix: "aws",
  },
  {
    name: "Security Hub",
    image: {
      hashed: "/images/hashed/e1688a86721132443fcd7ef1797a21b8.svg",
      original: "/images/original/aws-security-hub.svg",
    },
    prefix: "aws",
  },
  {
    name: "Server Migration Service",
    image: {
      hashed: "/images/hashed/ce152bb0d1f10fb08ada89bc9930cca5.svg",
      original: "/images/original/aws-server-migration-service.svg",
    },
    prefix: "aws",
  },
  {
    name: "Serverless Application Repository",
    image: {
      hashed: "/images/hashed/4d5a0e3f3b28fe4580f96cdf7c07cbe9.svg",
      original: "/images/original/aws-serverless-application-repository.svg",
    },
    prefix: "aws",
  },
  {
    name: "Service Catalog",
    image: {
      hashed: "/images/hashed/6e26eb3657449f1fc9e2ab3e403e071a.svg",
      original: "/images/original/aws-service-catalog.svg",
    },
    prefix: "aws",
  },
  {
    name: "Shield",
    image: {
      hashed: "/images/hashed/6103df5fffbf274e61a8e9a6e689a3b3.svg",
      original: "/images/original/aws-shield.svg",
    },
    prefix: "aws",
  },
  {
    name: "Signer",
    image: {
      hashed: "/images/hashed/3d6bf7ec9bacccfc2f6df00e9149db3e.svg",
      original: "/images/original/aws-signer.svg",
    },
    prefix: "aws",
  },
  {
    name: "Site To Site Vpn",
    image: {
      hashed: "/images/hashed/f04c0f3ab73c7c0537ca0cbd20d48de1.svg",
      original: "/images/original/aws-site-to-site-vpn.svg",
    },
    prefix: "aws",
  },
  {
    name: "Snowball Edge",
    image: {
      hashed: "/images/hashed/eea22f687d4b57e0cdca844bb78ae253.svg",
      original: "/images/original/aws-snowball-edge.svg",
    },
    prefix: "aws",
  },
  {
    name: "Snowball",
    image: {
      hashed: "/images/hashed/5b8de9fd957cc30ddfc843cbb0fa4c15.svg",
      original: "/images/original/aws-snowball.svg",
    },
    prefix: "aws",
  },
  {
    name: "Snowcone",
    image: {
      hashed: "/images/hashed/fd7f3861d10a832a9eece028ec8c5368.svg",
      original: "/images/original/aws-snowcone.svg",
    },
    prefix: "aws",
  },
  {
    name: "Snowmobile",
    image: {
      hashed: "/images/hashed/630876d4ce58d503faba8bfdcf381047.svg",
      original: "/images/original/aws-snowmobile.svg",
    },
    prefix: "aws",
  },
  {
    name: "Step Functions",
    image: {
      hashed: "/images/hashed/6e606dfd1056e07dc14cca6300e16322.svg",
      original: "/images/original/aws-step-functions.svg",
    },
    prefix: "aws",
  },
  {
    name: "Storage Gateway",
    image: {
      hashed: "/images/hashed/2b87524aded01f411ab406781ea14fc1.svg",
      original: "/images/original/aws-storage-gateway.svg",
    },
    prefix: "aws",
  },
  {
    name: "Support",
    image: {
      hashed: "/images/hashed/7b407a4cbca91175bcd1f5c26edd175b.svg",
      original: "/images/original/aws-support.svg",
    },
    prefix: "aws",
  },
  {
    name: "Systems Manager Incident Manager",
    image: {
      hashed: "/images/hashed/db0326e527c38c1ab21161831582d4f2.svg",
      original: "/images/original/aws-systems-manager-incident-manager.svg",
    },
    prefix: "aws",
  },
  {
    name: "Systems Manager",
    image: {
      hashed: "/images/hashed/b9b1a8bb2f1c883a20e62f0fca2a276a.svg",
      original: "/images/original/aws-systems-manager.svg",
    },
    prefix: "aws",
  },
  {
    name: "Thinkbox Deadline",
    image: {
      hashed: "/images/hashed/7e895845406827a0f486be6e971c3526.svg",
      original: "/images/original/aws-thinkbox-deadline.svg",
    },
    prefix: "aws",
  },
  {
    name: "Thinkbox Frost",
    image: {
      hashed: "/images/hashed/27cc92010d0860c41e442f0d1bee89e6.svg",
      original: "/images/original/aws-thinkbox-frost.svg",
    },
    prefix: "aws",
  },
  {
    name: "Thinkbox Krakatoa",
    image: {
      hashed: "/images/hashed/e56d82e23d278b58972859878231db86.svg",
      original: "/images/original/aws-thinkbox-krakatoa.svg",
    },
    prefix: "aws",
  },
  {
    name: "Thinkbox Sequoia",
    image: {
      hashed: "/images/hashed/6ac3f31d1a467a3568b5c71415ffdbb7.svg",
      original: "/images/original/aws-thinkbox-sequoia.svg",
    },
    prefix: "aws",
  },
  {
    name: "Thinkbox Stoke",
    image: {
      hashed: "/images/hashed/e472335c1f1d48e4307a26a0f3abb86d.svg",
      original: "/images/original/aws-thinkbox-stoke.svg",
    },
    prefix: "aws",
  },
  {
    name: "Thinkbox Xmesh",
    image: {
      hashed: "/images/hashed/fe864ba8d9f81ea3e2681fc843c5fa96.svg",
      original: "/images/original/aws-thinkbox-xmesh.svg",
    },
    prefix: "aws",
  },
  {
    name: "Tools And Sdks",
    image: {
      hashed: "/images/hashed/0813edd3dff78300f60c75e68a33b74f.svg",
      original: "/images/original/aws-tools-and-sdks.svg",
    },
    prefix: "aws",
  },
  {
    name: "Training Certification",
    image: {
      hashed: "/images/hashed/7f27f47241e07bc2b8c6f8c727cf5998.svg",
      original: "/images/original/aws-training-certification.svg",
    },
    prefix: "aws",
  },
  {
    name: "Transfer Family",
    image: {
      hashed: "/images/hashed/5d8f4358ed1d91e1d0fd05ff0a0dbf0a.svg",
      original: "/images/original/aws-transfer-family.svg",
    },
    prefix: "aws",
  },
  {
    name: "Transit Gateway",
    image: {
      hashed: "/images/hashed/35070c2883bcd0a3af4465f8575cfa60.svg",
      original: "/images/original/aws-transit-gateway.svg",
    },
    prefix: "aws",
  },
  {
    name: "Trusted Advisor",
    image: {
      hashed: "/images/hashed/f1bf1570c9613741437c13372b8145e0.svg",
      original: "/images/original/aws-trusted-advisor.svg",
    },
    prefix: "aws",
  },
  {
    name: "Waf",
    image: {
      hashed: "/images/hashed/ed7e6b8cdf404c4ec043de900a369c88.svg",
      original: "/images/original/aws-waf.svg",
    },
    prefix: "aws",
  },
  {
    name: "Wavelength",
    image: {
      hashed: "/images/hashed/93255de5a057524d60e1bb809c6f7ffb.svg",
      original: "/images/original/aws-wavelength.svg",
    },
    prefix: "aws",
  },
  {
    name: "Well Architected Tool",
    image: {
      hashed: "/images/hashed/3b75b6911a7c69799f3b71532be9284f.svg",
      original: "/images/original/aws-well-architected-tool.svg",
    },
    prefix: "aws",
  },
  {
    name: "X Ray",
    image: {
      hashed: "/images/hashed/f8df92494e15d25371bed69607f29792.svg",
      original: "/images/original/aws-x-ray.svg",
    },
    prefix: "aws",
  },
]
