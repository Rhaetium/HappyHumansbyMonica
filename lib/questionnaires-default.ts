// Default questionnaire templates for immediate use
import type { QuestionnaireTemplate } from './questionnaires'

export const DEFAULT_QUESTIONNAIRES: QuestionnaireTemplate[] = [
  {
    id: 'daily-style-attachement',
    title: 'Style d\'attachement',
    slug: 'style-attachement',
    description: 'Évaluez votre style d\'attachement dans les relations',
    intro_text: 'Ce questionnaire vous aidera à mieux comprendre votre style d\'attachement.',
    privacy_text: 'Vos réponses sont anonymes et utilisées uniquement à des fins statistiques.',
    anonymous: true,
    multi_step: false,
    progress_label: '',
    questions: [
      {
        id: 'q1',
        text: 'Lorsque mon partenaire demande de la proximité, je me sens...',
        type: 'scale',
        options: [1, 2, 3, 4, 5],
        required: true,
      },
      {
        id: 'q2',
        text: 'J\'ai tendance à m\'inquiéter quand mon partenaire ne me répond pas immédiatement.',
        type: 'scale',
        options: [1, 2, 3, 4, 5],
        required: true,
      },
      {
        id: 'q3',
        text: 'Je me sens à l\'aise d\'exprimer mes besoins émotionnels.',
        type: 'scale',
        options: [1, 2, 3, 4, 5],
        required: true,
      },
    ],
    anonymous: true,
    multi_step: false,
    progress_label: '',
  },
  {
    id: 'communication-skills',
    title: 'Compétences de communication',
    slug: 'communication',
    description: 'Auto-évaluation de vos compétences en communication',
    intro_text: 'Notez vos compétences en communication quotidienne.',
    privacy_text: 'Vos réponses sont confidentielles.',
    anonymous: true,
    multi_step: false,
    progress_label: '',
    questions: [
      {
        id: 'q1',
        text: 'J\'exprime clairement mes pensées et sentiments.',
        type: 'scale',
        options: [1, 2, 3, 4, 5],
        required: true,
      },
      {
        id: 'q2',
        text: 'J\'écoute activement lorsque mon partenaire parle.',
        type: 'scale',
        options: [1, 2, 3, 4, 5],
        required: true,
      },
      {
        id: 'q3',
        text: 'Je suis capable de donner des retours constructifs.',
        type: 'scale',
        options: [1, 2, 3, 4, 5],
        required: true,
      },
    ],
    anonymous: true,
    multi_step: false,
    progress_label: '',
  },
]

export const DEFAULT_FIRST_QUESTIONNAIRE = DEFAULT_QUESTIONNAIRES[0]
