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

/**
 * Build and Send email
 */
export async function buildAndSend(params: BuildAndSend): Promise<boolean> {
  const { participant, recipients, sourceImage } = params
  const fromAddr = 'no-reply@serverletto.net'
  const fromName = 'Serverletto by ServerlessGuru'
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
