import { DocumentService } from '../services/document.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AuthenticationError, ValidationError } from '../errors/specificErrors';

function requireUserId(req: AuthenticatedRequest): string {
  if (!req.user) throw new AuthenticationError();
  return req.user.id;
}

export const DocumentController = {
  list: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const documents = await DocumentService.listForHome(requireUserId(req), req.params.homeId);
    sendSuccess(res, { documents });
  }),

  upload: asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.file) throw new ValidationError('No file was uploaded');
    const document = await DocumentService.create(requireUserId(req), req.params.homeId, req.file, req.body);
    sendSuccess(res, { document }, 'Document uploaded', 201);
  }),

  download: asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { doc, absolutePath, redirectUrl } = await DocumentService.getForDownload(
      requireUserId(req),
      req.params.documentId,
    );
    if (redirectUrl) {
      res.redirect(redirectUrl);
      return;
    }
    res.download(absolutePath!, doc.originalName);
  }),

  remove: asyncHandler(async (req: AuthenticatedRequest, res) => {
    await DocumentService.delete(requireUserId(req), req.params.documentId);
    sendSuccess(res, null, 'Document deleted');
  }),
};
