'use server';

/**
 * @fileOverview Generates summaries of payroll reports using AI.
 *
 * - generateReportSummaries - A function that generates summaries of payroll reports.
 * - GenerateReportSummariesInput - The input type for the generateReportSummaries function.
 * - GenerateReportSummariesOutput - The return type for the generateReportSummaries function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateReportSummariesInputSchema = z.object({
  reportData: z.string().describe('The payroll report data to summarize.'),
});
export type GenerateReportSummariesInput = z.infer<typeof GenerateReportSummariesInputSchema>;

const GenerateReportSummariesOutputSchema = z.object({
  summary: z.string().describe('The AI-generated summary of the payroll report.'),
});
export type GenerateReportSummariesOutput = z.infer<typeof GenerateReportSummariesOutputSchema>;

export async function generateReportSummaries(input: GenerateReportSummariesInput): Promise<GenerateReportSummariesOutput> {
  return generateReportSummariesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateReportSummariesPrompt',
  input: {schema: GenerateReportSummariesInputSchema},
  output: {schema: GenerateReportSummariesOutputSchema},
  prompt: `You are an AI assistant specializing in summarizing payroll reports.
  Your goal is to identify key trends, anomalies, and potential issues within the provided report data.
  Provide a concise and informative summary that highlights important aspects for an administrator.
  \n  Report Data: {{{reportData}}}`,
});

const generateReportSummariesFlow = ai.defineFlow(
  {
    name: 'generateReportSummariesFlow',
    inputSchema: GenerateReportSummariesInputSchema,
    outputSchema: GenerateReportSummariesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
