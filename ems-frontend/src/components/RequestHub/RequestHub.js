import { Link } from "react-router-dom";

export default function RequestHub() {
  const forms = [
    { key: "ppe", label: "PPE Request" },
    { key: "material", label: "Material Request" },
    { key: "equipment", label: "Equipment Request" },
    { key: "transport", label: "Transport Request" },
    { key: "maintenance", label: "Maintenance Request" },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Request Hub</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forms.map((f) => (
          <Link
            key={f.key}
            to={f.key}   // relative path → works under /dashboard/requests/
            className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition"
          >
            <h3 className="text-lg font-semibold">{f.label}</h3>
            <p className="text-sm text-gray-500">Submit a {f.label.toLowerCase()} here</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
