const messages: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha incorretos.',
  USER_ALREADY_EXISTS: 'Já existe uma conta com este e-mail.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Já existe uma conta com este e-mail.',
  INVALID_EMAIL: 'E-mail inválido.',
  PASSWORD_TOO_SHORT: 'A senha precisa ter pelo menos 8 caracteres.',
  PASSWORD_TOO_LONG: 'A senha é longa demais.',
  INVALID_PASSWORD: 'Senha atual incorreta.',
}

/** Translates a Better Auth error into a message for the user. */
export function authErrorMessage(error: { code?: string; status?: number } | null) {
  if (error?.code && messages[error.code]) {
    return messages[error.code]
  }

  if (!error?.status) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
  }

  return 'Não foi possível concluir. Tente novamente.'
}
