import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface FighterStats {
  punches_thrown: number;
  punches_landed: number;
  kicks_thrown: number;
  kicks_landed: number;
  takedowns_attempted: number;
  takedowns_successful: number;
  submissions_attempted: number;
  clinch_time_percent: number;
  ground_time_percent: number;
  significant_strikes: number;
  head_strikes: number;
  body_strikes: number;
  leg_strikes: number;
  defense_rate: number;
}

interface Fighter {
  identifier: string;
  style: string;
  strengths: string[];
  weaknesses: string[];
}

interface PerformanceScores {
  overall: number;
  striking: number;
  grappling: number;
  defense: number;
  cardio: number;
}

export interface SparringAnalysisData {
  summary: string;
  duration_estimate: string;
  fighters: Fighter[];
  statistics: {
    fighter_1: FighterStats;
    fighter_2: FighterStats;
  };
  techniques_observed: {
    technique: string;
    fighter: string;
    execution: string;
    timestamp_approx: string;
  }[];
  recommendations: {
    fighter_1: string[];
    fighter_2: string[];
  };
  overall_analysis: string;
  performance_scores: {
    fighter_1: PerformanceScores;
    fighter_2: PerformanceScores;
  };
}

interface SparringPDFExportProps {
  analysis: SparringAnalysisData;
  videoName: string;
  analysisDate: string;
}

export const SparringPDFExport = ({ analysis, videoName, analysisDate }: SparringPDFExportProps) => {
  const [exporting, setExporting] = useState(false);

  const generatePDF = async () => {
    setExporting(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;

      // Palette
      const gold: [number, number, number] = [212, 175, 55];
      const goldSoft: [number, number, number] = [232, 200, 100];
      const ink: [number, number, number] = [28, 28, 32];
      const darkGray: [number, number, number] = [55, 55, 60];
      const subtle: [number, number, number] = [120, 120, 128];
      const red: [number, number, number] = [220, 53, 69];
      const blue: [number, number, number] = [13, 110, 253];
      const bgSoft: [number, number, number] = [248, 247, 244];

      const fighter1 = analysis.fighters?.[0];
      const fighter2 = analysis.fighters?.[1];
      const scores1 = analysis.performance_scores?.fighter_1;
      const scores2 = analysis.performance_scores?.fighter_2;
      const stats1 = analysis.statistics?.fighter_1;
      const stats2 = analysis.statistics?.fighter_2;

      // ============= COVER PAGE =============
      doc.setFillColor(15, 15, 18);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Top thin gold accent line
      doc.setFillColor(...gold);
      doc.rect(0, 0, pageWidth, 2, 'F');

      // Small top label
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...gold);
      doc.text('PRISM • SPARRING ANALYSIS', margin, 18);

      // Date right-aligned
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      const coverDate = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
      }).toUpperCase();
      doc.text(coverDate, pageWidth - margin, 18, { align: 'right' });

      // Brand block — large
      doc.setFontSize(56);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...gold);
      doc.text('KOREV', margin, pageHeight / 2 - 30);
      doc.setTextColor(255, 255, 255);
      doc.text('AI', margin + 80, pageHeight / 2 - 30);

      // Divider
      doc.setDrawColor(...gold);
      doc.setLineWidth(0.8);
      doc.line(margin, pageHeight / 2 - 18, margin + 30, pageHeight / 2 - 18);

      // Report title
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...goldSoft);
      doc.text('PERFORMANCE CENTER', margin, pageHeight / 2 - 8);

      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Rapport d\'Analyse', margin, pageHeight / 2 + 6);
      doc.setTextColor(...gold);
      doc.text('de Sparring', margin, pageHeight / 2 + 18);

      // BETA chip
      doc.setFillColor(...gold);
      doc.roundedRect(margin, pageHeight / 2 + 26, 22, 7, 1.5, 1.5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 15, 18);
      doc.text('BETA', margin + 11, pageHeight / 2 + 31, { align: 'center' });

      // Fight card (combattants)
      const cardY = pageHeight - 90;
      doc.setDrawColor(...gold);
      doc.setLineWidth(0.3);
      doc.line(margin, cardY, pageWidth - margin, cardY);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...gold);
      doc.text('COMBATTANTS', margin, cardY + 8);

      // Helper: fit text to a max width by shrinking font, then truncating with ellipsis
      const fitText = (text: string, maxWidth: number, startSize: number, minSize = 10) => {
        let size = startSize;
        doc.setFontSize(size);
        let w = doc.getTextWidth(text);
        while (w > maxWidth && size > minSize) {
          size -= 1;
          doc.setFontSize(size);
          w = doc.getTextWidth(text);
        }
        let out = text;
        while (doc.getTextWidth(out + '…') > maxWidth && out.length > 4) {
          out = out.slice(0, -1);
        }
        if (out !== text) out = out + '…';
        return { text: out, size };
      };

      const vsGap = 18; // reserved width around the centered "VS"
      const sideMax = (pageWidth - 2 * margin - vsGap * 2) / 2;
      const f1Name = fighter1?.identifier || 'Combattant 1';
      const f2Name = fighter2?.identifier || 'Combattant 2';
      const f1Style = fighter1?.style || 'Style non identifié';
      const f2Style = fighter2?.style || 'Style non identifié';

      // Fighter 1 left
      doc.setFont('helvetica', 'bold');
      const fit1 = fitText(f1Name, sideMax, 16, 10);
      doc.setFontSize(fit1.size);
      doc.setTextColor(255, 255, 255);
      doc.text(fit1.text, margin, cardY + 20);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      const fit1s = fitText(f1Style, sideMax, 9, 7);
      doc.setFontSize(fit1s.size);
      doc.text(fit1s.text, margin, cardY + 27);

      // VS center
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...gold);
      doc.text('VS', pageWidth / 2, cardY + 22, { align: 'center' });

      // Fighter 2 right
      doc.setFont('helvetica', 'bold');
      const fit2 = fitText(f2Name, sideMax, 16, 10);
      doc.setFontSize(fit2.size);
      doc.setTextColor(255, 255, 255);
      doc.text(fit2.text, pageWidth - margin, cardY + 20, { align: 'right' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 180, 180);
      const fit2s = fitText(f2Style, sideMax, 9, 7);
      doc.setFontSize(fit2s.size);
      doc.text(fit2s.text, pageWidth - margin, cardY + 27, { align: 'right' });

      // Meta row
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(140, 140, 140);
      const videoLabel = `VIDÉO  ${videoName}`;
      const fitVid = fitText(videoLabel, pageWidth - 2 * margin, 8, 6);
      doc.setFontSize(fitVid.size);
      doc.text(fitVid.text, margin, pageHeight - 32);
      doc.setFontSize(8);
      doc.text(`DURÉE  ${analysis.duration_estimate}`, margin, pageHeight - 26);
      doc.text(`ANALYSÉ LE  ${new Date(analysisDate).toLocaleDateString('fr-FR')}`, margin, pageHeight - 20);

      // Footer
      doc.setFillColor(...gold);
      doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');
      doc.setFontSize(7);
      doc.setTextColor(15, 15, 18);
      doc.setFont('helvetica', 'bold');
      doc.text('CONFIDENTIEL • USAGE PERSONNEL', pageWidth / 2, pageHeight - 2, { align: 'center' });

      // ============= CONTENT PAGES =============
      doc.addPage();
      let yPosition = margin + 10;

      // Page header band
      const drawPageHeader = () => {
        doc.setFillColor(...gold);
        doc.rect(0, 0, pageWidth, 1.5, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...gold);
        doc.text('KOREV AI', margin, 8);
        doc.setTextColor(...subtle);
        doc.setFont('helvetica', 'normal');
        doc.text('Rapport d\'Analyse de Sparring', pageWidth - margin, 8, { align: 'right' });
      };
      drawPageHeader();

      const sectionTitle = (label: string) => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...gold);
        doc.text(label, margin, yPosition);
        doc.setDrawColor(...gold);
        doc.setLineWidth(0.4);
        doc.line(margin, yPosition + 2, margin + 18, yPosition + 2);
        yPosition += 9;
      };

      const checkNewPage = (requiredSpace: number) => {
        if (yPosition + requiredSpace > pageHeight - 25) {
          doc.addPage();
          drawPageHeader();
          yPosition = margin + 10;
        }
      };

      // SUMMARY
      sectionTitle('RÉSUMÉ DU COMBAT');
      const summaryLines = doc.splitTextToSize(analysis.summary || '', pageWidth - 2 * margin);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkGray);
      doc.text(summaryLines, margin, yPosition);
      yPosition += summaryLines.length * 5 + 10;

      // PERFORMANCE SCORES with bars
      if (scores1 && scores2) {
        checkNewPage(100);
        sectionTitle('SCORES DE PERFORMANCE');

        // Overall scores big numbers
        doc.setFillColor(...bgSoft);
        doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 30, 2, 2, 'F');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...red);
        doc.text(fighter1?.identifier || 'Combattant 1', margin + 6, yPosition + 8);
        doc.setFontSize(28);
        doc.setTextColor(...ink);
        doc.text(`${scores1.overall}`, margin + 6, yPosition + 24);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...subtle);
        doc.text('/100', margin + 26, yPosition + 24);

        // center label
        doc.setFontSize(8);
        doc.setTextColor(...subtle);
        doc.text('SCORE GLOBAL', pageWidth / 2, yPosition + 18, { align: 'center' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...blue);
        doc.text(fighter2?.identifier || 'Combattant 2', pageWidth - margin - 6, yPosition + 8, { align: 'right' });
        doc.setFontSize(28);
        doc.setTextColor(...ink);
        doc.text(`${scores2.overall}`, pageWidth - margin - 6, yPosition + 24, { align: 'right' });

        yPosition += 38;

        // Per-axis bars
        const axes: Array<[string, number, number]> = [
          ['Striking', scores1.striking, scores2.striking],
          ['Grappling', scores1.grappling, scores2.grappling],
          ['Défense', scores1.defense, scores2.defense],
          ['Cardio', scores1.cardio, scores2.cardio],
        ];
        const barW = (pageWidth - 2 * margin) / 2 - 30;
        axes.forEach(([label, v1, v2]) => {
          checkNewPage(14);
          // Label center
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...darkGray);
          doc.text(label, pageWidth / 2, yPosition + 4, { align: 'center' });

          // Values
          doc.setFontSize(9);
          doc.setTextColor(...red);
          doc.text(`${v1}`, margin, yPosition + 4);
          doc.setTextColor(...blue);
          doc.text(`${v2}`, pageWidth - margin, yPosition + 4, { align: 'right' });

          // Bars
          const barY = yPosition + 6;
          // Fighter 1 bar (right-to-left from center)
          doc.setFillColor(245, 245, 245);
          doc.rect(pageWidth / 2 - barW - 8, barY, barW, 3, 'F');
          doc.setFillColor(...red);
          const w1 = (Math.max(0, Math.min(100, v1)) / 100) * barW;
          doc.rect(pageWidth / 2 - 8 - w1, barY, w1, 3, 'F');
          // Fighter 2 bar (left-to-right from center)
          doc.setFillColor(245, 245, 245);
          doc.rect(pageWidth / 2 + 8, barY, barW, 3, 'F');
          doc.setFillColor(...blue);
          const w2 = (Math.max(0, Math.min(100, v2)) / 100) * barW;
          doc.rect(pageWidth / 2 + 8, barY, w2, 3, 'F');

          yPosition += 13;
        });

        yPosition += 4;
      }

      // STATISTICS TABLE
      if (stats1 && stats2) {
        checkNewPage(80);
        sectionTitle('STATISTIQUES DÉTAILLÉES');

        // Table header
        doc.setFillColor(...ink);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 9, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('STATISTIQUE', margin + 4, yPosition + 6);
        doc.setTextColor(...goldSoft);
        doc.text(fighter1?.identifier || 'Rouge', pageWidth - margin - 50, yPosition + 6, { align: 'center' });
        doc.text(fighter2?.identifier || 'Bleu', pageWidth - margin - 15, yPosition + 6, { align: 'center' });
        yPosition += 11;

        const statsRows: [string, string, string][] = [
          ['Coups de poing', `${stats1.punches_landed}/${stats1.punches_thrown}`, `${stats2.punches_landed}/${stats2.punches_thrown}`],
          ['Coups de pied', `${stats1.kicks_landed}/${stats1.kicks_thrown}`, `${stats2.kicks_landed}/${stats2.kicks_thrown}`],
          ['Takedowns', `${stats1.takedowns_successful}/${stats1.takedowns_attempted}`, `${stats2.takedowns_successful}/${stats2.takedowns_attempted}`],
          ['Frappes tête', `${stats1.head_strikes}`, `${stats2.head_strikes}`],
          ['Frappes corps', `${stats1.body_strikes}`, `${stats2.body_strikes}`],
          ['Frappes jambes', `${stats1.leg_strikes}`, `${stats2.leg_strikes}`],
          ['Temps clinch', `${stats1.clinch_time_percent}%`, `${stats2.clinch_time_percent}%`],
          ['Temps au sol', `${stats1.ground_time_percent}%`, `${stats2.ground_time_percent}%`],
          ['Taux de défense', `${stats1.defense_rate}%`, `${stats2.defense_rate}%`],
        ];

        statsRows.forEach((row, index) => {
          checkNewPage(10);
          if (index % 2 === 0) {
            doc.setFillColor(...bgSoft);
            doc.rect(margin, yPosition - 3, pageWidth - 2 * margin, 8, 'F');
          }
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...darkGray);
          doc.text(row[0], margin + 4, yPosition + 2);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...red);
          doc.text(row[1], pageWidth - margin - 50, yPosition + 2, { align: 'center' });
          doc.setTextColor(...blue);
          doc.text(row[2], pageWidth - margin - 15, yPosition + 2, { align: 'center' });
          yPosition += 8;
        });

        yPosition += 8;
      }

      // RECOMMENDATIONS
      const drawRecs = (
        label: string,
        recs: string[] | undefined,
        color: [number, number, number],
      ) => {
        if (!recs?.length) return;
        checkNewPage(20);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...color);
        doc.text(label, margin, yPosition);
        yPosition += 6;

        recs.forEach((rec, i) => {
          const lines = doc.splitTextToSize(rec, pageWidth - 2 * margin - 10);
          checkNewPage(lines.length * 5 + 4);
          // Bullet number
          doc.setFillColor(...color);
          doc.circle(margin + 2, yPosition + 1, 1.6, 'F');
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text(`${i + 1}`, margin + 2, yPosition + 2.2, { align: 'center' });
          // Body
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...darkGray);
          doc.text(lines, margin + 8, yPosition + 2);
          yPosition += lines.length * 5 + 3;
        });
        yPosition += 6;
      };

      checkNewPage(40);
      sectionTitle('RECOMMANDATIONS D\'ENTRAÎNEMENT');
      drawRecs(fighter1?.identifier || 'Combattant 1', analysis.recommendations?.fighter_1, red);
      drawRecs(fighter2?.identifier || 'Combattant 2', analysis.recommendations?.fighter_2, blue);

      // OVERALL
      if (analysis.overall_analysis) {
        checkNewPage(40);
        sectionTitle('ANALYSE GLOBALE');
        const lines = doc.splitTextToSize(analysis.overall_analysis, pageWidth - 2 * margin);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...darkGray);
        doc.text(lines, margin, yPosition);
        yPosition += lines.length * 5;
      }

      // Footer on every page (skip cover)
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(...gold);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...gold);
        doc.text('KOREV AI — PERFORMANCE CENTER', margin, pageHeight - 8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...subtle);
        doc.text(`Page ${i - 1} / ${totalPages - 1}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
      }

      // Save
      const fileName = `korev-analyse-sparring-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.success('PDF exporté avec succès !');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      className="gap-2"
      onClick={generatePDF}
      disabled={exporting}
    >
      {exporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Génération...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Exporter PDF
        </>
      )}
    </Button>
  );
};

export default SparringPDFExport;

