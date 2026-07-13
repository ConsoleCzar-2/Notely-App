/**
 * Custom hook for form handling with validation
 */

import { useState, useCallback } from 'react';

export const useForm = (initialValues = {}, validate = () => ({})) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validateField = useCallback((name, value) => {
    const validationErrors = validate({ ...values, [name]: value });
    setErrors(prev => ({ ...prev, [name]: validationErrors[name] }));
    return !validationErrors[name];
  }, [values, validate]);

  const handleChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    const newValue = type === 'checkbox' ? checked : value;
    setValues(prev => ({ ...prev, [name]: newValue }));
    
    // Validate on change if field was touched
    if (touched[name]) {
      validateField(name, newValue);
    }
  }, [touched, validateField]);

  const handleBlur = useCallback((event) => {
    const { name, value } = event.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, value);
  }, [validateField]);

  const handleSubmit = useCallback((onSubmit) => async (event) => {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    setSubmitting(true);
    
    // Validate all fields
    const validationErrors = validate(values);
    setErrors(validationErrors);
    setTouched(Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    
    const isValid = Object.keys(validationErrors).length === 0;
    
    if (isValid && onSubmit) {
      try {
        await onSubmit(values);
      } catch (err) {
        // Handle submission errors
        console.error('Form submission error:', err);
      }
    }
    
    setSubmitting(false);
    return isValid;
  }, [values, validate]);

  const resetForm = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setSubmitting(false);
  }, [initialValues]);

  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  return {
    values,
    errors,
    touched,
    submitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldError,
    validateField,
    isValid: Object.keys(errors).length === 0,
  };
};

export default useForm;