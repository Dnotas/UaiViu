/**
 * Valida se um número é brasileiro válido
 * Números brasileiros têm o formato: 55 + DDD (2 dígitos) + número (8 ou 9 dígitos)
 * Total: 12 ou 13 dígitos
 */

interface ValidationResult {
  isValid: boolean;
  isGroup: boolean;
  cleanNumber: string;
  errorMessage?: string;
}

const ValidateBrazilianNumber = (number: string): ValidationResult => {
  const cleanNumber = number.replace(/\D/g, "");

  // Números de grupo são longos (> 13 dígitos) e sempre válidos
  if (cleanNumber.length > 13) {
    return {
      isValid: true,
      isGroup: true,
      cleanNumber
    };
  }

  // Para números pessoais, deve ser brasileiro
  // Formato esperado: 55 + DDD (2 dígitos) + número (8 ou 9 dígitos)
  // Exemplos:
  // - 5537991470016 (13 dígitos - celular com 9)
  // - 553799147001 (12 dígitos - celular antigo ou fixo)

  // Deve ter 12 ou 13 dígitos
  if (cleanNumber.length < 12 || cleanNumber.length > 13) {
    return {
      isValid: false,
      isGroup: false,
      cleanNumber,
      errorMessage: `Número inválido: ${cleanNumber} tem ${cleanNumber.length} dígitos (esperado: 12-13 para brasileiros, >13 para grupos)`
    };
  }

  // Deve começar com 55 (código do Brasil)
  if (!cleanNumber.startsWith("55")) {
    return {
      isValid: false,
      isGroup: false,
      cleanNumber,
      errorMessage: `Número não é brasileiro: ${cleanNumber} não começa com 55. Apenas números brasileiros são permitidos.`
    };
  }

  // Verificar DDD (deve estar entre 11 e 99)
  const ddd = parseInt(cleanNumber.substring(2, 4));
  if (ddd < 11 || ddd > 99) {
    return {
      isValid: false,
      isGroup: false,
      cleanNumber,
      errorMessage: `DDD inválido: ${ddd}. DDDs válidos vão de 11 a 99.`
    };
  }

  // Número válido
  return {
    isValid: true,
    isGroup: false,
    cleanNumber
  };
};

export default ValidateBrazilianNumber;
