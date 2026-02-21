import { onRequestGet as __api_admin_export_approved_js_onRequestGet } from "/Users/elainamarriott/Documents/SAAS Projects/Which_AI_Pick/functions/api/admin/export-approved.js"
import { onRequestGet as __api_admin_metrics_js_onRequestGet } from "/Users/elainamarriott/Documents/SAAS Projects/Which_AI_Pick/functions/api/admin/metrics.js"
import { onRequestGet as __api_admin_submission_js_onRequestGet } from "/Users/elainamarriott/Documents/SAAS Projects/Which_AI_Pick/functions/api/admin/submission.js"
import { onRequestGet as __api_admin_submissions_js_onRequestGet } from "/Users/elainamarriott/Documents/SAAS Projects/Which_AI_Pick/functions/api/admin/submissions.js"
import { onRequestPost as __api_admin_update_js_onRequestPost } from "/Users/elainamarriott/Documents/SAAS Projects/Which_AI_Pick/functions/api/admin/update.js"
import { onRequestPost as __api_submit_tool_js_onRequestPost } from "/Users/elainamarriott/Documents/SAAS Projects/Which_AI_Pick/functions/api/submit-tool.js"

export const routes = [
    {
      routePath: "/api/admin/export-approved",
      mountPath: "/api/admin",
      method: "GET",
      middlewares: [],
      modules: [__api_admin_export_approved_js_onRequestGet],
    },
  {
      routePath: "/api/admin/metrics",
      mountPath: "/api/admin",
      method: "GET",
      middlewares: [],
      modules: [__api_admin_metrics_js_onRequestGet],
    },
  {
      routePath: "/api/admin/submission",
      mountPath: "/api/admin",
      method: "GET",
      middlewares: [],
      modules: [__api_admin_submission_js_onRequestGet],
    },
  {
      routePath: "/api/admin/submissions",
      mountPath: "/api/admin",
      method: "GET",
      middlewares: [],
      modules: [__api_admin_submissions_js_onRequestGet],
    },
  {
      routePath: "/api/admin/update",
      mountPath: "/api/admin",
      method: "POST",
      middlewares: [],
      modules: [__api_admin_update_js_onRequestPost],
    },
  {
      routePath: "/api/submit-tool",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_submit_tool_js_onRequestPost],
    },
  ]