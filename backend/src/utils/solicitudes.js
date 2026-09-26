const transitions = {
  CLIENTE: {
    PENDIENTE: ['CANCELADA'],
    ACEPTADA: ['CANCELADA'],
  },
  PRESTADOR: {
    PENDIENTE: ['ACEPTADA', 'RECHAZADA'],
    ACEPTADA: ['FINALIZADA'],
  },
};

function canTransition(role, from, to) {
  return transitions[role]?.[from]?.includes(to) ?? false;
}

module.exports = { canTransition };
