'use server';

/**
 * @fileOverview Flow for customizing payroll calculation rules using natural language.
 *
 * - customizePayrollRules - A function that allows administrators to customize payroll rules.
 * - CustomizePayrollRulesInput - The input type for the customizePayrollRules function.
 * - CustomizePayrollRulesOutput - The return type for the customizePayrollRules function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CustomizePayrollRulesInputSchema = z.object({
  employeeName: z.string().describe('The name of the employee to customize rules for.'),
  currentRules: z.string().describe('The current payroll calculation rules.'),
  customInstructions: z.string().describe('Natural language instructions for customizing the payroll rules.'),
});
export type CustomizePayrollRulesInput = z.infer<typeof CustomizePayrollRulesInputSchema>;

const CustomizePayrollRulesOutputSchema = z.object({
  adjustedRules: z.string().describe('The adjusted payroll calculation rules based on the instructions.'),
});
export type CustomizePayrollRulesOutput = z.infer<typeof CustomizePayrollRulesOutputSchema>;

export async function customizePayrollRules(input: CustomizePayrollRulesInput): Promise<CustomizePayrollRulesOutput> {
  return customizePayrollRulesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customizePayrollRulesPrompt',
  input: {schema: CustomizePayrollRulesInputSchema},
  output: {schema: CustomizePayrollRulesOutputSchema},
  prompt: `You are an expert payroll rule customizer. You take existing payroll rules and adjust them based on custom instructions provided in natural language.

Employee Name: {{{employeeName}}}
Current Rules: {{{currentRules}}}
Instructions: {{{customInstructions}}}

Adjusted Rules:`, 
});

const customizePayrollRulesFlow = ai.defineFlow(
  {
    name: 'customizePayrollRulesFlow',
    inputSchema: CustomizePayrollRulesInputSchema,
    outputSchema: CustomizePayrollRulesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
