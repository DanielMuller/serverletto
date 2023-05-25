import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import { createMimeMessage } from 'mimetext'
import { Participants } from 'participants'

const ses = new SESv2Client({ region: process.env.AWS_REGION })

interface BuildAndSend {
  participant: Participants.Item
  recipients: {
    addr: string
    name: string
  }[]
  sourceImage: string
}
interface Notify {
  participant: Participants.Item
}
const fromAddr = 'no-reply@serverletto.net'
const fromName = 'Serverletto by ServerlessGuru'

/**
 * Build and Send email
 */
export async function buildAndSend(params: BuildAndSend): Promise<boolean> {
  const { participant, recipients, sourceImage } = params
  const msg = createMimeMessage()
  msg.setSender({ name: fromName, addr: fromAddr })
  msg.setTo('Serverletto Admin <no-reply@serverletto.net>')
  for (const recipient of recipients) {
    msg.setBcc({ addr: recipient.addr, name: recipient.name })
  }
  msg.setSubject('[Serverletto] New Image')
  msg.addMessage({
    contentType: 'text/plain',
    data: `A new image was create on Serverletto:
  
  Id: ${participant.participantId}
  Participant name: ${participant.name}
  CreatedAt: ${participant.createdAt}
  Language: ${participant.locale || ''}
  `,
  })
  msg.addAttachment({
    filename: `${participant.participantId}.jpg`,
    contentType: 'image/jpg',
    data: sourceImage,
  })

  const sesParams = {
    FromEmailAddress: `${fromName} <${fromAddr}>`,
    Destination: {
      ToAddresses: recipients.map((recipient) => recipient.addr),
    },
    Content: {
      Raw: {
        Data: Buffer.from(msg.asRaw(), 'utf8'),
      },
    },
  }
  await ses.send(new SendEmailCommand(sesParams))
  return true
}

/**
 * Build and Send email
 */
export async function notify(params: Notify): Promise<boolean> {
  const { participant } = params
  // const msg = createMimeMessage()
  // msg.setSender({ name: fromName, addr: fromAddr })
  // msg.setTo(`${participant.name} <${participant.email}>`)
  // const subject = participant.locale ==='fr'? 'Vous avez gagné':'You have won'
  // msg.setSubject(`[Serverletto] ${subject}`)
  // msg.addMessage({
  //   contentType: 'text/plain',
  //   data: `A new image was create on Serverletto:

  // Id: ${participant.participantId}
  // Participant name: ${participant.name}
  // CreatedAt: ${participant.createdAt}
  // Language: ${participant.locale || ''}
  // `,
  // })
  // msg.addAttachment({
  //   filename: `${participant.participantId}.jpg`,
  //   contentType: 'image/jpg',
  //   data: sourceImage,
  // })
  const localMessage: Record<string, string> = {}
  localMessage.fr = `Vous avez participé à Serverletto au Stand de ServerlessGuru et vous avez été tiré au sort.

Venez prendre possession de votre prix au stand de ServerlessGuru avant la fin de la manifestion.

Meilleures Salutations,

L'équipe de ServerlessGuru
`
  localMessage.en = `You have participated at Serverletto at the ServerlessGuru Stand and you have won.

Come and claim you price at the ServerlessGuru's booth before the end of the event.

Best Regards,

The ServerlessGuru Team
`
  const subject = participant.locale === 'fr' ? 'Vous avez gagné' : 'You have won'
  const message = participant.locale === 'fr' ? localMessage.fr : localMessage.en

  const sesParams = {
    FromEmailAddress: `${fromName} <${fromAddr}>`,
    Destination: {
      ToAddresses: [`${participant.name} <${participant.email}>`],
    },
    Content: {
      Simple: {
        Body: {
          Text: {
            Data: message,
            Charset: 'utf-8',
          },
        },
        Subject: {
          Data: `[Serverletto] ${subject}`,
          Charset: 'utf-8',
        },
      },
    },
  }
  await ses.send(new SendEmailCommand(sesParams))
  return true
}
