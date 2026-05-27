// import OpenAI from 'openai';

// const openai = new OpenAI({
//   apiKey: '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',
//   baseURL: 'https://integrate.api.nvidia.com/v1',
// })
 
// async function main() {
//   const completion = await openai.chat.completions.create({
//     model: "minimaxai/minimax-m2.7",
//     messages: [{"role":"user","content":""}],
//     temperature: 0.5,
//     top_p: 0.5,
//     max_tokens: 1200,
//     stream: true
//   })
   
//   for await (const chunk of completion) {
//     process.stdout.write(chunk.choices[0]?.delta?.content || '')
    
//   }
  
// }

// main();