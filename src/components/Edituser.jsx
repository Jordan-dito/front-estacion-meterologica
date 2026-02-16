const ModalEditarUsuario = ({ usuario, onClose, onSave, loading }) => {
  const [form, setForm] = useState({
    first_name: usuario.first_name || "",
    email: usuario.email || "",
    rol: usuario.rol || "estudiante",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(usuario.id, form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center">
      <div className="bg-white p-6 rounded-xl w-96 shadow-lg">
        <h2 className="text-xl font-bold mb-4">Editar Usuario</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            placeholder="Nombre"
            className="w-full px-3 py-2 border rounded"
          />

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Correo"
            className="w-full px-3 py-2 border rounded"
          />

          <select
            name="rol"
            value={form.rol}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="estudiante">Estudiante</option>
            <option value="profesor">Profesor</option>
            <option value="administrativo">Administrativo</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {loading ? "Guardando..." : "Guardar Cambios"}
          </button>
        </form>

        <button
          onClick={onClose}
          className="w-full mt-3 text-gray-600 underline"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};
