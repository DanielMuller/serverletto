declare module 'participants' {
  namespace Participants {
    enum Step {
      NEW = 'new',
      IMAGE = 'image',
      PROFILE = 'profile',
      DONE = 'done',
    }
    interface Item {
      participantId: string
      createdAt?: string
      updatedAt: string
      name?: string
      email?: string
      image?: {
        bucket: string
        key: string
        crop?: {
          width: number
          height: number
          left: number
          top: number
        }
      }
      step: Step
    }
  }
}
