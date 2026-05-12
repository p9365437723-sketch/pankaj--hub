import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

export function useContentEditor(chapterId, categoryId, subjectId) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch content on mount
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const docRef = doc(db, "content", chapterId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setContent(docSnap.data());
        } else {
          setContent({
            chapterId,
            categoryId,
            subjectId,
          });
        }
      } catch (error) {
        console.error("Error fetching content:", error);
        toast.error("Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    if (chapterId && categoryId && subjectId) {
      fetchContent();
    }
  }, [chapterId, categoryId, subjectId]);

  // Save a single field
  const saveField = useCallback(async (field, value) => {
    setSaving(true);
    try {
      const docRef = doc(db, "content", chapterId);
      const updateData = {
        [field]: value,
        updatedAt: serverTimestamp(),
        chapterId,
        categoryId,
        subjectId,
      };

      await setDoc(docRef, updateData, { merge: true });

      setContent((prev) => ({
        ...prev,
        [field]: value,
      }));

      toast.success("Saved!");
    } catch (error) {
      console.error("Error saving field:", error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [chapterId, categoryId, subjectId]);

  // Save all content
  const saveAll = useCallback(async (fullContent) => {
    setSaving(true);
    try {
      const docRef = doc(db, "content", chapterId);
      const updateData = {
        ...fullContent,
        updatedAt: serverTimestamp(),
        chapterId,
        categoryId,
        subjectId,
      };

      await setDoc(docRef, updateData, { merge: true });
      toast.success("All content saved!");
    } catch (error) {
      console.error("Error saving all:", error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [chapterId, categoryId, subjectId]);

  // Update local content without saving
  const updateLocalContent = useCallback((updates) => {
    setContent((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  return {
    content,
    setContent,
    loading,
    saving,
    saveField,
    saveAll,
    updateLocalContent,
  };
}
