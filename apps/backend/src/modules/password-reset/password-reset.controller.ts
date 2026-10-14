import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  CheckPasswordResetInput,
  RequestPasswordResetInput,
  VerifyPasswordResetInput,
} from './password-reset.schema.js';
import type { PasswordResetService } from './password-reset.service.js';

export class PasswordResetController {
  constructor(private service: PasswordResetService) {}

  request = async (
    req: FastifyRequest<{ Body: RequestPasswordResetInput }>,
    reply: FastifyReply,
  ) => {
    const input = req.body;
    await this.service.request(input);
    return reply.send({
      message: 'Se o e-mail estiver cadastrado, você receberá o código em breve.',
    });
  };

  check = async (req: FastifyRequest<{ Body: CheckPasswordResetInput }>, reply: FastifyReply) => {
    const input = req.body;
    await this.service.check(input);
    return reply.send({ message: 'Código válido.' });
  };

  verify = async (req: FastifyRequest<{ Body: VerifyPasswordResetInput }>, reply: FastifyReply) => {
    const input = req.body;
    await this.service.verify(input);
    return reply.send({ message: 'Senha alterada com sucesso.' });
  };
}
