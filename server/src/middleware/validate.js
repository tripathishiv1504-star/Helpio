import { fail } from '../utils/response.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = schema.parse(dataToValidate);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err.errors && Array.isArray(err.errors)) {
        const errorMessages = err.errors.map((e) => {
          const field = e.path.join('.');
          return field ? `${field}: ${e.message}` : e.message;
        });
        return fail(res, 400, errorMessages.join(', '));
      }
      return fail(res, 400, err.message || 'Validation failed');
    }
  };
}

export default validate;
