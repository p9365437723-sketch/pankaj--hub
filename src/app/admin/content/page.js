"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";
import {
  Plus,
  Edit2,
  Trash2,
  Folder,
  BookOpen,
  Layers,
  ChevronRight,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import ContentEditor from "@/components/ContentEditor";

export default function CMSPage() {
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);

  const [activeCategory, setActiveCategory] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [activeChapter, setActiveChapter] = useState(null);

  const [loadingAction, setLoadingAction] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [modalMode, setModalMode] = useState("add");
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    order: 0,
    categoryId: "",
    subjectId: "",
  });
  const [modalSubjects, setModalSubjects] = useState([]);

  // ============ FIRESTORE LISTENERS ============
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "categories"), (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "subjects"), (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          categoryId: doc.data().categoryId || "",
          ...doc.data(),
        }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      setSubjects(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "chapters"), (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      setChapters(data);
    });
    return () => unsub();
  }, []);

  // ============ MODAL SUBJECT FILTERING ============
  useEffect(() => {
    if (formData.categoryId) {
      const filtered = subjects.filter((s) => s.categoryId === formData.categoryId);
      setModalSubjects(filtered);

      if (
        !subjects.find(
          (s) =>
            s.id === formData.subjectId &&
            s.categoryId === formData.categoryId
        )
      ) {
        setFormData((prev) => ({ ...prev, subjectId: "" }));
      }
    } else {
      setModalSubjects([]);
    }
  }, [formData.categoryId, subjects]);

  // ============ DISPLAY FILTERING ============
  const displaySubjects = activeCategory
    ? subjects.filter((s) => s.categoryId === activeCategory.id)
    : [];

  const displayChapters = activeSubject
    ? chapters.filter((c) => c.subjectId === activeSubject.id)
    : [];

  // ============ HANDLERS ============
  const openModal = (type, mode, item = null) => {
    setModalType(type);
    setModalMode(mode);
    setEditItem(item);

    if (mode === "edit" && item) {
      setFormData({
        name: item.name,
        order: item.order || 0,
        categoryId: item.categoryId || "",
        subjectId: item.subjectId || "",
      });
    } else {
      setFormData({
        name: "",
        order: 0,
        categoryId: activeCategory?.id || "",
        subjectId: activeSubject?.id || "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    if (modalType === "subject" && !formData.categoryId) {
      toast.error("Please select a Category");
      return;
    }

    if (modalType === "chapter") {
      if (!formData.categoryId) {
        toast.error("Please select a Category");
        return;
      }
      if (!formData.subjectId) {
        toast.error("Please select a Subject");
        return;
      }
    }

    setLoadingAction(true);
    try {
      const collectionName =
        modalType === "category"
          ? "categories"
          : modalType === "subject"
            ? "subjects"
            : "chapters";

      const data = {
        name: formData.name.trim(),
        order: parseInt(formData.order) || 0,
        updatedAt: serverTimestamp(),
      };

      if (modalType === "subject") {
        data.categoryId = formData.categoryId;
      }

      if (modalType === "chapter") {
        data.categoryId = formData.categoryId;
        data.subjectId = formData.subjectId;
      }

      if (modalMode === "add") {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, collectionName), data);
        toast.success(`${modalType} added!`);
      } else {
        await updateDoc(doc(db, collectionName, editItem.id), data);
        toast.success(`${modalType} updated!`);
      }

      setIsModalOpen(false);
      setFormData({ name: "", order: 0, categoryId: "", subjectId: "" });

      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (confirm(`Delete this ${type}?`)) {
      setLoadingAction(true);
      try {
        const collectionName =
          type === "category"
            ? "categories"
            : type === "subject"
              ? "subjects"
              : "chapters";

        if (type === "category") {
          const dependent = subjects.filter((s) => s.categoryId === id);
          if (dependent.length > 0) {
            throw new Error(
              `Cannot delete. Has ${dependent.length} subject(s).`
            );
          }
        }

        if (type === "subject") {
          const dependent = chapters.filter((c) => c.subjectId === id);
          if (dependent.length > 0) {
            throw new Error(
              `Cannot delete. Has ${dependent.length} chapter(s).`
            );
          }
        }

        await deleteDoc(doc(db, collectionName, id));

        if (type === "category" && activeCategory?.id === id) {
          setActiveCategory(null);
          setActiveSubject(null);
        }
        if (type === "subject" && activeSubject?.id === id) {
          setActiveSubject(null);
        }
        if (type === "chapter" && activeChapter?.id === id) {
          setActiveChapter(null);
        }

        toast.success(`${type} deleted!`);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoadingAction(false);
      }
    }
  };

  if (activeChapter) {
    return (
      <div className="animate-in fade-in duration-500 flex flex-col h-full">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setActiveChapter(null)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {activeChapter.name}
            </h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ContentEditor
            chapterId={activeChapter.id}
            categoryId={activeChapter.categoryId}
            subjectId={activeChapter.subjectId}
            onClose={() => setActiveChapter(null)}
          />
        </div>
      </div>
    );
  }

  const renderList = (items, type, activeItem, setActiveFunction) => (
    <div className="glass-panel p-4 flex flex-col h-[500px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white capitalize">
          {type === "category"
            ? "Categories"
            : type === "subject"
              ? "Subjects"
              : "Chapters"}{" "}
          ({items.length})
        </h2>
        <button
          onClick={() => openModal(type, "add")}
          className="btn-primary py-1 px-3 text-sm flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {items.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            No {type}s found.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${activeItem?.id === item.id
                  ? "bg-primary-600/20 border-primary-500/50 text-white"
                  : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                }`}
              onClick={() => setActiveFunction(item)}
            >
              <div className="flex items-center gap-3">
                {type === "category" ? (
                  <Layers className="w-4 h-4 text-emerald-400" />
                ) : type === "subject" ? (
                  <BookOpen className="w-4 h-4 text-purple-400" />
                ) : (
                  <Folder className="w-4 h-4 text-orange-400" />
                )}
                <span className="font-medium">{item.name}</span>
              </div>
              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => openModal(type, "edit", item)}
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(type, item.id)}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <ChevronRight
                  className={`w-4 h-4 ml-1 ${activeItem?.id === item.id
                      ? "text-primary-400"
                      : "text-gray-500"
                    }`}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold text-white mb-2">Content CMS</h1>
      <p className="text-emerald-100/60 mb-8">
        Manage categories, subjects, and chapters.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {renderList(categories, "category", activeCategory, (cat) => {
          setActiveCategory(cat);
          setActiveSubject(null);
        })}
        {renderList(displaySubjects, "subject", activeSubject, (sub) => {
          setActiveSubject(sub);
        })}
        {renderList(displayChapters, "chapter", activeChapter, (chap) => {
          setActiveChapter(chap);
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
          <div className="glass-panel p-6 w-full max-w-md m-4 shadow-2xl border border-white/20">
            <h2 className="text-xl font-bold text-white mb-6 capitalize">
              {modalMode} {modalType}
            </h2>
            <form onSubmit={handleSave} className="space-y-5">
              {(modalType === "subject" || modalType === "chapter") && (
                <div>
                  <label className="block text-sm font-medium text-emerald-100/80 mb-2">
                    Select Category *
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    className="input-field appearance-none bg-black/40 text-white cursor-pointer"
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modalType === "chapter" && (
                <div>
                  <label className="block text-sm font-medium text-emerald-100/80 mb-2">
                    Select Subject *
                  </label>
                  <select
                    required
                    value={formData.subjectId}
                    onChange={(e) =>
                      setFormData({ ...formData, subjectId: e.target.value })
                    }
                    className="input-field appearance-none bg-black/40 text-white cursor-pointer"
                    disabled={!formData.categoryId}
                  >
                    <option value="">-- Choose Subject --</option>
                    {modalSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                  {!formData.categoryId && (
                    <p className="text-xs text-orange-400 mt-1">
                      Select category first
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-emerald-100/80 mb-2">
                  {modalType.charAt(0).toUpperCase() + modalType.slice(1)} Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-emerald-100/80 mb-2">
                  Order
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="input-field"
                />
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="btn-primary flex items-center gap-2"
                >
                  {loadingAction ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
