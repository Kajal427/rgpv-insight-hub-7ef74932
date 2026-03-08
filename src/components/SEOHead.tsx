import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description?: string;
}

export const SEOHead = ({ title, description }: SEOHeadProps) => {
  useEffect(() => {
    document.title = `${title} | RGPV Analyzer`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && description) {
      metaDesc.setAttribute("content", description);
    } else if (description) {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = description;
      document.head.appendChild(meta);
    }
  }, [title, description]);

  return null;
};
