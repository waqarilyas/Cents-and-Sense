package com.centsandsense.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.io.File

class AccountsWidgetProvider : AppWidgetProvider() {
    
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }
    
    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_accounts)
        
        try {
            val widgetData = readWidgetData(context)
            val accountsArray = widgetData.optJSONArray("accounts")
            val currency = widgetData.optString("currency", "$")
            var totalBalance = 0.0
            
            if (accountsArray != null && accountsArray.length() > 0) {
                // Show up to 3 accounts
                for (i in 0 until minOf(3, accountsArray.length())) {
                    val account = accountsArray.getJSONObject(i)
                    val name = account.optString("name", "")
                    val type = account.optString("type", "").replaceFirstChar { it.uppercase() }
                    val balance = account.optDouble("balance", 0.0)
                    totalBalance += balance
                    
                    when (i) {
                        0 -> {
                            views.setTextViewText(R.id.account1_name, name)
                            views.setTextViewText(R.id.account1_type, type)
                            views.setTextViewText(R.id.account1_balance, "${currency}${String.format("%.2f", balance)}")
                            views.setViewVisibility(R.id.account1_container, View.VISIBLE)
                        }
                        1 -> {
                            views.setTextViewText(R.id.account2_name, name)
                            views.setTextViewText(R.id.account2_type, type)
                            views.setTextViewText(R.id.account2_balance, "${currency}${String.format("%.2f", balance)}")
                            views.setViewVisibility(R.id.account2_container, View.VISIBLE)
                        }
                        2 -> {
                            views.setTextViewText(R.id.account3_name, name)
                            views.setTextViewText(R.id.account3_type, type)
                            views.setTextViewText(R.id.account3_balance, "${currency}${String.format("%.2f", balance)}")
                            views.setViewVisibility(R.id.account3_container, View.VISIBLE)
                        }
                    }
                }
                
                // Hide unused account containers
                if (accountsArray.length() < 3) views.setViewVisibility(R.id.account3_container, View.GONE)
                if (accountsArray.length() < 2) views.setViewVisibility(R.id.account2_container, View.GONE)
                if (accountsArray.length() < 1) views.setViewVisibility(R.id.account1_container, View.GONE)
            }
            
            // Update total balance
            views.setTextViewText(R.id.total_balance, "${currency}${String.format("%.2f", totalBalance)}")
            
        } catch (e: Exception) {
            android.util.Log.e("AccountsWidget", "Error updating widget", e)
            views.setTextViewText(R.id.total_balance, "$0.00")
        }
        
        // Set up deep link to open accounts screen
        val openAccountsIntent = Intent(Intent.ACTION_VIEW, Uri.parse("centsandsense://accounts"))
        val openAccountsPendingIntent = PendingIntent.getActivity(
            context,
            0,
            openAccountsIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_title, openAccountsPendingIntent)
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
    
    private fun readWidgetData(context: Context): JSONObject {
        return try {
            val file = File(context.filesDir, "widget_data.json")
            if (file.exists()) {
                val jsonString = file.readText()
                JSONObject(jsonString)
            } else {
                JSONObject()
            }
        } catch (e: Exception) {
            android.util.Log.e("AccountsWidget", "Error reading widget data", e)
            JSONObject()
        }
    }
    
    companion object {
        fun updateAllWidgets(context: Context) {
            val intent = Intent(context, AccountsWidgetProvider::class.java)
            intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            val ids = AppWidgetManager.getInstance(context)
                .getAppWidgetIds(android.content.ComponentName(context, AccountsWidgetProvider::class.java))
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            context.sendBroadcast(intent)
        }
    }
}
