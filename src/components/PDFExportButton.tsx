import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Crown } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

interface PDFExportButtonProps {
  content: string;
  title?: string;
}

interface PdfLayout {
  margin: number;
  contentWidth: number;
  lineHeight: number;
}

const isHeadingLine = (line: string) =>
  line.startsWith("##") || line.startsWith("**") || /^\d+[.):]\s/.test(line);

const isBulletLine = (line: string) =>
  line.startsWith("-") || line.startsWith("•") || line.startsWith("*");

// Ajoute une nouvelle page (avec en-tête) si l'espace vertical est insuffisant.
// Renvoie la position Y à utiliser ensuite.
const addPageIfNeeded = (doc: jsPDF, y: number, pageWidth: number, pageHeight: number): number => {
  if (y <= pageHeight - 30) return y;
  doc.addPage();
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pageWidth, 15, "F");
  doc.setTextColor(234, 179, 8);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("KOREV AI", 15, 10);
  return 25;
};

const renderHeading = (doc: jsPDF, line: string, layout: PdfLayout, y: number): number => {
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(layout.margin - 2, y - 4, layout.contentWidth + 4, 8, 1, 1, "F");
  doc.setTextColor(234, 179, 8);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  const cleanLine = line.replace(/^[#*]+\s*/, "").replace(/\*\*/g, "");
  const splitLines = doc.splitTextToSize(cleanLine, layout.contentWidth);
  doc.text(splitLines[0], layout.margin, y);
  let next = y + layout.lineHeight + 2;
  for (const splitLine of splitLines.slice(1)) {
    doc.text(splitLine, layout.margin, next);
    next += layout.lineHeight;
  }
  return next;
};

const renderBullet = (doc: jsPDF, line: string, layout: PdfLayout, y: number): number => {
  doc.setTextColor(234, 179, 8);
  doc.setFontSize(10);
  doc.text("●", layout.margin, y);
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const bulletContent = line.replace(/^[-•*]\s*/, "").replace(/\*\*/g, "");
  const splitLines = doc.splitTextToSize(bulletContent, layout.contentWidth - 8);
  let next = y;
  for (const splitLine of splitLines) {
    doc.text(splitLine, layout.margin + 6, next);
    next += layout.lineHeight;
  }
  return next;
};

const renderParagraph = (doc: jsPDF, line: string, layout: PdfLayout, y: number): number => {
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const cleanLine = line.replace(/\*\*/g, "");
  const splitLines = doc.splitTextToSize(cleanLine, layout.contentWidth);
  let next = y;
  for (const splitLine of splitLines) {
    doc.text(splitLine, layout.margin, next);
    next += layout.lineHeight;
  }
  return next;
};

export const PDFExportButton = ({ content, title = "Programme d'entraînement" }: PDFExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const detectProgramType = (text: string): string => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("boxe") || lowerText.includes("boxing")) return "Programme de Boxe";
    if (lowerText.includes("mma") || lowerText.includes("mixed martial")) return "Programme MMA";
    if (lowerText.includes("jiu-jitsu") || lowerText.includes("bjj")) return "Programme Jiu-Jitsu";
    if (lowerText.includes("muay thai") || lowerText.includes("kickboxing")) return "Programme Muay Thai";
    if (lowerText.includes("musculation") || lowerText.includes("strength")) return "Programme Musculation";
    if (lowerText.includes("macro") || lowerText.includes("nutrition") || lowerText.includes("calorie")) return "Plan Nutritionnel";
    if (lowerText.includes("recette") || lowerText.includes("recipe")) return "Recette Protéinée";
    return title;
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      // Premium dark background header
      doc.setFillColor(15, 15, 15);
      doc.rect(0, 0, pageWidth, 50, "F");

      // Gold accent line
      doc.setFillColor(234, 179, 8);
      doc.rect(0, 50, pageWidth, 3, "F");

      // Logo text - KOREV AI
      doc.setTextColor(234, 179, 8);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text("KOREV AI", pageWidth / 2, 25, { align: "center" });

      // Subtitle
      doc.setTextColor(180, 180, 180);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Performance Center • Coach IA", pageWidth / 2, 35, { align: "center" });

      // Program title
      const programTitle = detectProgramType(content);
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(programTitle, pageWidth / 2, 65, { align: "center" });

      // Date
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const currentDate = new Date().toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      doc.text(`Généré le ${currentDate}`, pageWidth / 2, 73, { align: "center" });

      // Divider line
      doc.setDrawColor(234, 179, 8);
      doc.setLineWidth(0.5);
      doc.line(margin, 80, pageWidth - margin, 80);

      // Content
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");

      // Parse and format content
      const lines = content.split("\n");
      const layout: PdfLayout = { margin, contentWidth, lineHeight: 6 };
      let yPosition = 90;

      for (const line of lines) {
        const trimmedLine = line.trim();

        yPosition = addPageIfNeeded(doc, yPosition, pageWidth, pageHeight);

        if (!trimmedLine) {
          yPosition += layout.lineHeight / 2;
          continue;
        }

        if (isHeadingLine(trimmedLine)) {
          yPosition = renderHeading(doc, trimmedLine, layout, yPosition);
        } else if (isBulletLine(trimmedLine)) {
          yPosition = renderBullet(doc, trimmedLine, layout, yPosition);
        } else {
          yPosition = renderParagraph(doc, trimmedLine, layout, yPosition);
        }
      }

      // Footer on last page
      const lastPageHeight = doc.internal.pageSize.getHeight();
      doc.setFillColor(15, 15, 15);
      doc.rect(0, lastPageHeight - 20, pageWidth, 20, "F");
      
      doc.setTextColor(234, 179, 8);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Programme généré par KOREV AI • Coach IA Personnel", pageWidth / 2, lastPageHeight - 10, { align: "center" });

      // Premium badge
      doc.setFillColor(234, 179, 8);
      doc.roundedRect(pageWidth - 45, lastPageHeight - 15, 35, 10, 2, 2, "F");
      doc.setTextColor(15, 15, 15);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("PREMIUM", pageWidth - 27.5, lastPageHeight - 9, { align: "center" });

      // Save the PDF
      const fileName = `KOREV_AI_${programTitle.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("PDF exporté avec succès !");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Erreur lors de l'export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportToPDF}
      disabled={isExporting}
      className="gap-2 border-primary/30 hover:bg-primary/10 hover:border-primary"
    >
      {isExporting ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <>
          <FileDown className="h-3 w-3" />
          <Crown className="h-3 w-3 text-primary" />
        </>
      )}
      <span className="text-xs">Export PDF</span>
    </Button>
  );
};
