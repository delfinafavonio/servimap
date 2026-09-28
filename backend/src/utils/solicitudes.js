const transitions = {
  CLIENTE: {
    PENDIENTE: ['CANCELADA'],
    PROPUESTA_ENVIADA: ['ACEPTADA', 'CANCELADA'],
    ACEPTADA: ['CANCELADA'],
  },
  PRESTADOR: {
    PENDIENTE: ['PROPUESTA_ENVIADA', 'RECHAZADA'],
    ACEPTADA: ['FINALIZADA'],
  },
};

function canTransition(role, from, to) {
  return transitions[role]?.[from]?.includes(to) ?? false;
}

module.exports = { canTransition };
