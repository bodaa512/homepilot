import { AIConversation, AIMessage } from '../models/AIConversation';
import { buildHomeAIContext } from '../ai/contextBuilder';
import { callAnthropic } from '../ai/aiClient';
import { assertHomeAccess } from './authorization.service';

const SYSTEM_PROMPT_TEMPLATE = (context: string) => `أنت المساعد الذكي لتطبيق HomePilot، نظام إدارة المنازل.
ترد دائمًا باللغة العربية، بأسلوب واضح ومباشر ومفيد.
استخدم فقط البيانات التالية الخاصة بهذا المنزل للإجابة — لا تخترع بيانات غير موجودة هنا، ولا تفترض معلومات عن منازل أو مستخدمين آخرين:

${context}

قواعد مهمة:
- ميّز بوضوح بين الحقائق المؤكدة من البيانات أعلاه والتوصيات الاجتهادية (استخدم عبارات مثل "أنصح بـ" أو "قد يكون من المفيد" للتوصيات).
- لا تدّعي اليقين في تنبؤات مستقبلية (مثل تكلفة إصلاح متوقعة) — قدّمها كتقدير فقط.
- إذا سُئلت عن شيء غير موجود في البيانات أعلاه، قل بوضوح إن هذه المعلومة غير متوفرة حاليًا في النظام.
- كن مختصرًا ومركّزًا؛ استخدم نقاطًا عند الحاجة.`;

export const AIAssistantService = {
  async chat(userId: string, homeId: string, userMessage: string) {
    await assertHomeAccess(userId, homeId, 'ai:use');

    const conversation = await AIConversation.findOneAndUpdate(
      { user: userId, home: homeId },
      { $setOnInsert: { user: userId, home: homeId }, lastMessageAt: new Date() },
      { new: true, upsert: true },
    );

    await AIMessage.create({ conversation: conversation._id, role: 'user', content: userMessage });

    const context = await buildHomeAIContext(homeId);
    const replyText = await callAnthropic(SYSTEM_PROMPT_TEMPLATE(context), userMessage);

    const assistantMessage = await AIMessage.create({
      conversation: conversation._id,
      role: 'assistant',
      content: replyText,
    });

    return assistantMessage;
  },

  async getHistory(userId: string, homeId: string) {
    await assertHomeAccess(userId, homeId);
    const conversation = await AIConversation.findOne({ user: userId, home: homeId });
    if (!conversation) return [];
    return AIMessage.find({ conversation: conversation._id }).sort({ createdAt: 1 });
  },
};
