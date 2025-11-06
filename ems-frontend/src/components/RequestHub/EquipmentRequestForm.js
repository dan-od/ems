import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function EquipmentForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    request_type: "equipment",
    equipment_name: "",
    equipment_description: "",
    is_new_equipment: false,
    quantity: 1,
    urgency: "medium",
    notes: ""
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/requests", {
        request_type: "equipment",
        priority: formData.urgency,
        subject: `Equipment Request: ${formData.equipment_name}`,
        description: formData.equipment_description || formData.notes,
        lines: [{
          equipment_name: formData.equipment_name,
          quantity: Number(formData.quantity) || 1,
          urgency: formData.urgency,
          notes: formData.notes,
          is_new_equipment: formData.is_new_equipment
        }],
      });
      setMessage("✅ Equipment request submitted successfully!");
      setTimeout(() => navigate("/dashboard/my-requests"), 2000);
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to submit request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Equipment Request</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="is_new_equipment"
            name="is_new_equipment"
            checked={formData.is_new_equipment}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <label htmlFor="is_new_equipment" className="ml-2 text-sm text-gray-700">
            Request new equipment (not in inventory)
          </label>
        </div>

        {formData.is_new_equipment ? (
          <>
            <div>
              <label htmlFor="equipment_name" className="block text-sm font-medium text-gray-700">
                New Equipment Name *
              </label>
              <input
                type="text"
                id="equipment_name"
                name="equipment_name"
                value={formData.equipment_name}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <div>
              <label htmlFor="equipment_description" className="block text-sm font-medium text-gray-700">
                Description *
              </label>
              <textarea
                id="equipment_description"
                name="equipment_description"
                value={formData.equipment_description}
                onChange={handleChange}
                required
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                placeholder="Describe the equipment, specifications, and intended use..."
              />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="equipment_name" className="block text-sm font-medium text-gray-700">
              Equipment Name *
            </label>
            <input
              type="text"
              id="equipment_name"
              name="equipment_name"
              value={formData.equipment_name}
              onChange={handleChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              placeholder="Enter equipment name from inventory"
            />
          </div>
        )}

        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
            Quantity *
          </label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            min="1"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>

        <div>
          <label htmlFor="urgency" className="block text-sm font-medium text-gray-700">
            Urgency *
          </label>
          <select
            id="urgency"
            name="urgency"
            value={formData.urgency}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Additional Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="Any additional information or special requirements..."
          />
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard/requests")}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Submit Request
          </button>
        </div>
      </form>
      {message && <p className="mt-4 text-center">{message}</p>}

    </div>
  );
}