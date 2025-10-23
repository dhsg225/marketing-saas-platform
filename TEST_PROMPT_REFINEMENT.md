# 🧪 AI-Powered Image Prompt Refinement - Testing Guide

## 🎯 **Testing Overview**

This guide will help you test the complete AI-powered image prompt refinement system from client feedback to refined image generation.

## 📋 **Prerequisites**

### ✅ **Database Schema Applied**
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `uakfsxlsmmmpqsjjhlnb`
3. Go to **SQL Editor**
4. Copy and paste the schema from `database/prompt-refinement-schema.sql`
5. Click **Run** to execute
6. Verify these tables were created:
   - `prompt_refinement_sessions`
   - `prompt_feedback`
   - `prompt_iterations`
   - `image_generation_results`
   - `prompt_comparisons`

### ✅ **Environment Variables**
Ensure these are set in your Vercel project:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `CLAUDE_API_KEY` - Your Claude API key (already configured in your system)

## 🧪 **Test Scenarios**

### **Test 1: Basic Prompt Refinement Flow**

1. **Navigate to Content Generator**
   - Go to `/generate` in your app
   - Select a project
   - Enter a basic image prompt: `"A modern office with plants"`

2. **Test AI Refinement**
   - Click the **🎨 Refine** button next to the prompt field
   - In the refinement dialog, enter client feedback: `"make it more colorful and add more plants"`
   - Click **✨ Refine Prompt with AI**
   - Verify the AI suggests an improved prompt
   - Check the confidence score (should be 0.0-1.0)

3. **Test Side-by-Side Comparison**
   - Verify you can see original vs refined prompts
   - Check that the refined prompt addresses the feedback
   - Test the **✅ Approve** button

4. **Test Manual Override**
   - Enter manual feedback: `"add a coffee cup on the desk"`
   - Click **✨ Refine Prompt with AI**
   - Edit the AI suggestion manually
   - Verify the manual edit is preserved

### **Test 2: Multiple Iterations**

1. **Create Initial Session**
   - Start with prompt: `"A professional headshot"`
   - Create a refinement session

2. **First Iteration**
   - Feedback: `"make it more casual"`
   - Verify AI refinement works
   - Check iteration number is 2

3. **Second Iteration**
   - Feedback: `"add a smile"`
   - Verify new iteration is created (number 3)
   - Check iteration history shows all versions

4. **Test Iteration History**
   - Verify you can see all iterations
   - Check that each iteration shows the correct prompt
   - Verify timestamps are correct

### **Test 3: Image Generation Integration**

1. **Generate Image from Refined Prompt**
   - After refining a prompt, click **🎨 Generate** on any iteration
   - Verify the image generation process starts
   - Check that the generated image URL is returned

2. **Test Asset Integration**
   - Verify generated images are saved to the asset library
   - Check that metadata includes the prompt and refinement session info

### **Test 4: Error Handling**

1. **Invalid Session**
   - Try to refine with invalid session ID
   - Verify proper error message

2. **Missing Feedback**
   - Try to refine without feedback or manual edit
   - Verify validation error

3. **AI Service Error**
   - Test with invalid OpenAI API key
   - Verify graceful fallback

## 🔍 **Verification Checklist**

### **Database Verification**
- [ ] All tables created successfully
- [ ] RLS policies working (users can only see their data)
- [ ] Triggers working (initial iteration created automatically)
- [ ] Indexes created for performance

### **API Verification**
- [ ] Health check endpoint working: `/api/prompt-refinement/health`
- [ ] Session creation working: `POST /api/prompt-refinement`
- [ ] Prompt refinement working: `PUT /api/prompt-refinement`
- [ ] Session retrieval working: `GET /api/prompt-refinement`

### **Frontend Verification**
- [ ] EnhancedImagePromptField renders correctly
- [ ] Refinement dialog opens and closes properly
- [ ] Side-by-side comparison shows correctly
- [ ] Iteration history displays properly
- [ ] Manual override works
- [ ] Image generation integration works

### **AI Integration Verification**
- [ ] OpenAI API calls working
- [ ] AI refinements are relevant and helpful
- [ ] Confidence scores are reasonable (0.0-1.0)
- [ ] Error handling for AI failures

## 🐛 **Common Issues & Solutions**

### **Issue: Database Connection Error**
- **Solution**: Verify Supabase credentials in environment variables
- **Check**: Go to Supabase dashboard and verify project is active

### **Issue: AI Refinement Not Working**
- **Solution**: Check OpenAI API key is valid and has credits
- **Check**: Test OpenAI API directly with a simple prompt

### **Issue: Frontend Components Not Loading**
- **Solution**: Check browser console for JavaScript errors
- **Check**: Verify all imports are correct

### **Issue: Images Not Generating**
- **Solution**: Check image generation API endpoint
- **Check**: Verify asset library integration

## 📊 **Success Metrics**

### **Functional Metrics**
- ✅ Refinement sessions can be created
- ✅ AI refinements are relevant and helpful
- ✅ Multiple iterations work correctly
- ✅ Side-by-side comparison is accurate
- ✅ Manual overrides work
- ✅ Image generation integration works

### **Performance Metrics**
- ✅ API responses under 2 seconds
- ✅ AI refinements under 5 seconds
- ✅ Database queries optimized
- ✅ Frontend components load quickly

### **User Experience Metrics**
- ✅ Intuitive interface
- ✅ Clear feedback and error messages
- ✅ Smooth workflow from feedback to generation
- ✅ Helpful AI suggestions

## 🎯 **Next Steps After Testing**

1. **If All Tests Pass**: System is ready for production use
2. **If Issues Found**: Document issues and create fixes
3. **Performance Optimization**: Monitor and optimize as needed
4. **User Training**: Create user guides for the new features

## 📝 **Test Results Template**

```
Test Date: ___________
Tester: ___________

Database Schema: ✅ / ❌
API Endpoints: ✅ / ❌
Frontend Components: ✅ / ❌
AI Integration: ✅ / ❌
Image Generation: ✅ / ❌
Error Handling: ✅ / ❌

Issues Found:
1. ________________
2. ________________
3. ________________

Overall Status: ✅ Ready / ❌ Needs Fixes
```

---

## 🚀 **Ready to Test!**

The AI-Powered Image Prompt Refinement System is now fully implemented and ready for testing. Follow this guide to verify all functionality works correctly and provide feedback on any issues found.
