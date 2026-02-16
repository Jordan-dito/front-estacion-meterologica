import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader, ShieldCheck, ArrowLeft } from 'lucide-react';

const ResetPassword = ({ token, onBackToLogin, apiBaseUrl = 'https://dancar.pythonanywhere.com/api' }) => {
  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState(null);
  const [userEmail, setUserEmail] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setTokenError('No se proporcionó un token de recuperación.');
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/password-reset/validate/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setTokenValid(true);
        setUserEmail(data.email || '');
      } else {
        setTokenError(data.error || 'Token inválido o expirado.');
      }
    } catch (err) {
      setTokenError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = {
    minLength: newPassword.length >= 8,
    hasNumber: /\d/.test(newPassword),
    hasLetter: /[a-zA-Z]/.test(newPassword),
    passwordsMatch: newPassword === confirmPassword && newPassword.length > 0,
  };

  const isFormValid = 
    passwordValidation.minLength && 
    passwordValidation.hasNumber && 
    passwordValidation.hasLetter && 
    passwordValidation.passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/password-reset/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setSubmitError(data.error || 'Error al actualizar.');
      }
    } catch (err) {
      setSubmitError('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  // LOADING
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center">
          <Loader className="animate-spin text-green-600 mx-auto" size={48} />
          <p className="text-gray-600 mt-4">Validando enlace...</p>
        </div>
      </div>
    );
  }

  // TOKEN INVÁLIDO
  if (tokenError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-600" size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Enlace Inválido</h2>
          <p className="text-gray-600 mb-6">{tokenError}</p>
          <button
            onClick={onBackToLogin}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} />
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  // ÉXITO
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="text-green-600" size={48} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Contraseña Actualizada!</h2>
          <p className="text-gray-600 mb-6">Ya puedes iniciar sesión con tu nueva contraseña.</p>
          <button
            onClick={onBackToLogin}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  // FORMULARIO
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Nueva Contraseña</h1>
          {userEmail && <p className="text-green-100 text-sm mt-1">Para: {userEmail}</p>}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nueva Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition"
                disabled={submitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition"
                disabled={submitting}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Requisitos:</p>
            <ValidationItem valid={passwordValidation.minLength} text="Mínimo 8 caracteres" />
            <ValidationItem valid={passwordValidation.hasLetter} text="Al menos una letra" />
            <ValidationItem valid={passwordValidation.hasNumber} text="Al menos un número" />
            <ValidationItem valid={passwordValidation.passwordsMatch} text="Las contraseñas coinciden" />
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              <span className="text-sm">{submitError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!isFormValid || submitting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader className="animate-spin" size={20} />
                Actualizando...
              </>
            ) : (
              <>
                <ShieldCheck size={20} />
                Actualizar Contraseña
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full text-gray-600 hover:text-gray-800 text-sm py-2 transition flex items-center justify-center gap-1"
          >
            <ArrowLeft size={16} />
            Volver al Login
          </button>
        </form>
      </div>
    </div>
  );
};

const ValidationItem = ({ valid, text }) => (
  <div className={`flex items-center gap-2 text-sm ${valid ? 'text-green-600' : 'text-gray-500'}`}>
    {valid ? (
      <CheckCircle size={16} className="text-green-600" />
    ) : (
      <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
    )}
    <span>{text}</span>
  </div>
);

export default ResetPassword;
