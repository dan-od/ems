import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function MaintenanceForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    request_type: "maintenance",
    equipment_id: "",
    issue_description: "",
    urgency: "medium",
    location: "",
    contact_person: "",
    preferred_date: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

    async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
        await api.post("/requests", {
        request_type: "maintenance",
        priority: formData.urgency,
        subject: `Maintenance Request for Equipment ${formData.equipment_id}`,
        description: formData.issue_description,
        lines: [
            {
            equipment_id: formData.equipment_id,
            issue: formData.issue_description,
            location: formData.location,
            contact_person: formData.contact_person,
            preferred_date: formData.preferred_date,
            quantity: 1
            }
        ]
        });
        setMessage("✅ Maintenance request submitted successfully!");
        setTimeout(() => navigate("/requests"), 2000);
    } catch (err) {
        console.error(err);
        setMessage("❌ Failed to submit request: " + (err.response?.data?.error || err.message));
    } finally {
        setLoading(false);
    }
    }


  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Maintenance Request</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="equipment_id" className="block text-sm font-medium text-gray-700">
            Equipment ID *
          </label>
          <input
            type="text"
            id="equipment_id"
            name="equipment_id"
            value={formData.equipment_id}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="Enter equipment ID or serial number"
          />
        </div>

        <div>
          <label htmlFor="issue_description" className="block text-sm font-medium text-gray-700">
            Issue Description *
          </label>
          <textarea
            id="issue_description"
            name="issue_description"
            value={formData.issue_description}
            onChange={handleChange}
            required
            rows={4}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="Describe the issue in detail, including any error messages or unusual behavior..."
          />
        </div>

        <div>
          <label htmlFor="urgency" className="block text-sm font-medium text-gray-700">
            Urgency Level *
          </label>
          <select
            id="urgency"
            name="urgency"
            value={formData.urgency}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          >
            <option value="low">Low - Minor issue, can wait</option>
            <option value="medium">Medium - Needs attention soon</option>
            <option value="high">High - Affecting operations</option>
            <option value="critical">Critical - Safety hazard or complete breakdown</option>
          </select>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Equipment Location *
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="Where is the equipment located?"
          />
        </div>

        <div>
          <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700">
            Contact Person *
          </label>
          <input
            type="text"
            id="contact_person"
            name="contact_person"
            value={formData.contact_person}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="Who should maintenance personnel contact?"
          />
        </div>

        <div>
          <label htmlFor="preferred_date" className="block text-sm font-medium text-gray-700">
            Preferred Maintenance Date
          </label>
          <input
            type="datetime-local"
            id="preferred_date"
            name="preferred_date"
            value={formData.preferred_date}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate("/requests")}
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