import { Router } from 'express';
import authRoutes from './auth.routes';
import homeRoutes from './home.routes';
import roomRoutes from './room.routes';
import assetRoutes from './asset.routes';
import maintenanceRoutes from './maintenance.routes';
import notificationRoutes from './notification.routes';
import expenseRoutes from './expense.routes';
import subscriptionRoutes from './subscription.routes';
import providerRoutes from './provider.routes';
import serviceRequestRoutes from './serviceRequest.routes';
import offerRoutes from './offer.routes';
import appointmentRoutes from './appointment.routes';
import aiRoutes from './ai.routes';
import propertyRoutes from './property.routes';
import paymentRoutes from './payment.routes';
import adminRoutes from './admin.routes';
import documentRoutes from './document.routes';
import achievementRoutes from './achievement.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/homes', homeRoutes);
router.use('/rooms', roomRoutes);
router.use('/assets', assetRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/notifications', notificationRoutes);
router.use('/expenses', expenseRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/providers', providerRoutes);
router.use('/service-requests', serviceRequestRoutes);
router.use('/offers', offerRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/ai', aiRoutes);
router.use('/properties', propertyRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/documents', documentRoutes);
router.use('/achievements', achievementRoutes);

// Feature routers added in later phases:
// ...

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'HomePilot API is running', data: { timestamp: new Date().toISOString() } });
});

export default router;
