import { Router } from 'express';
import { verificarToken } from '../middlewares/auth.middleware';
import {
  listarContactos,
  obtenerConversacion,
  enviarMensaje,
  conteoNoLeidos
} from '../controllers/chat.controller';

const router = Router();

router.get('/contactos', verificarToken, listarContactos);
router.get('/conversacion/:contactoId', verificarToken, obtenerConversacion);
router.post('/mensajes', verificarToken, enviarMensaje);
router.get('/no-leidos', verificarToken, conteoNoLeidos);

export default router;
