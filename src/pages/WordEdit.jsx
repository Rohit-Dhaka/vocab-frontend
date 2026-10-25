import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import WordForm from "../components/WordForm";
import { getWord, createWord, updateWord } from "../api";

export default function WordEdit() {
  const { id } = useParams(); // id hai to edit, nahi to add
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [word, setWord] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Edit mode mein pehle purana word laayein (single get)
  useEffect(() => {
    if (!isEdit) return;

    getWord(id)
      .then(setWord)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    setError("");

    try {
      const saved = isEdit
        ? await updateWord(id, formData)
        : await createWord(formData);

      // Save ke baad us language ki list par jayein
      navigate(`/words/${saved.language}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="rounded-lg bg-white p-2 text-slate-600 shadow-sm"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-bold">{isEdit ? "Edit word" : "New word"}</h1>
      </div>

      {error && (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        // Edit mein word aane ke baad hi form dikhta hai, taaki purani values bhar jayein
        (!isEdit || word) && (
          <WordForm
            key={word?._id || "new"}
            initial={word}
            submitLabel={isEdit ? "Update word" : "Add word"}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        )
      )}
    </div>
  );
}