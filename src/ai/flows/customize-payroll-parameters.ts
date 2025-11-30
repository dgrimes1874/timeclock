'use server';

/**
 * @fileOverview Flow for customizing payroll calculation parameters using natural language.
 *
 * - customizePayrollParameters - A function that allows administrators to customize payroll parameters.
 * - CustomizePayrollParametersInput - The input type for the customizePayrollParameters function.
 * - CustomizePayrollParametersOutput - The return type for the customizePayrollParameters function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CustomizePayrollParametersInputSchema = z.object({
  employeeName: z.string().describe('The name of the employee to customize parameters for.'),
  currentParameters: z.string().describe('The current payroll calculation parameters.'),
  customInstructions: z.string().describe('Natural language instructions for customizing the payroll parameters.'),
});
export type CustomizePayrollParametersInput = z.infer<typeof CustomizePayrollParametersInputSchema>;

const CustomizePayrollParametersOutputSchema = z.object({
  adjustedParameters: z.string().describe('The adjusted payroll calculation parameters based on the instructions.'),
});
export type CustomizePayrollParametersOutput = z.infer<typeof CustomizePayrollParametersOutputSchema>;

export async function customizePayrollParameters(input: CustomizePayrollParametersInput): Promise<CustomizePayrollParametersOutput> {
  return customizePayrollParametersFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customizePayrollParametersPrompt',
  input: {schema: CustomizePayrollParametersInputSchema},
  output: {schema: CustomizePayrollParametersOutputSchema},
  prompt: `You are an expert payroll parameter customizer. You take existing payroll parameters and adjust them based on custom instructions provided in natural language.

Employee Name: {{{employeeName}}}
Current Parameters: {{{currentParameters}}}
Instructions: {{{customInstructions}}}

Adjusted Parameters:`,
});

const customizePayrollParametersFlow = ai.defineFlow(
  {
    name: 'customizePayrollParametersFlow',
    inputSchema: CustomizePayrollParametersInputSchema,
    outputSchema: CustomizePayrollParametersOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
