package com.centsandsense.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.Window
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class QuickAddActivity : Activity() {
    
    private lateinit var amountInput: EditText
    private lateinit var descriptionInput: EditText
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        setContentView(R.layout.activity_quick_add)
        
        amountInput = findViewById(R.id.amount_input)
        descriptionInput = findViewById(R.id.description_input)
        val addButton = findViewById<Button>(R.id.add_button)
        val cancelButton = findViewById<Button>(R.id.cancel_button)
        
        // Quick amount buttons
        findViewById<Button>(R.id.quick_5).setOnClickListener { amountInput.setText("5.00") }
        findViewById<Button>(R.id.quick_10).setOnClickListener { amountInput.setText("10.00") }
        findViewById<Button>(R.id.quick_20).setOnClickListener { amountInput.setText("20.00") }
        findViewById<Button>(R.id.quick_50).setOnClickListener { amountInput.setText("50.00") }
        
        addButton.setOnClickListener {
            val amountText = amountInput.text.toString()
            if (amountText.isNotEmpty()) {
                try {
                    val amount = amountText.toDouble()
                    val description = descriptionInput.text.toString()
                    savePendingTransaction(amount, description)
                    Toast.makeText(this, "Expense added: \$${"%.2f".format(amount)}", Toast.LENGTH_SHORT).show()
                    
                    // Update widgets
                    BudgetWidgetProvider.updateAllWidgets(this)
                    
                    // Open the app
                    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                    if (launchIntent != null) {
                        startActivity(launchIntent)
                    }
                    finish()
                } catch (e: NumberFormatException) {
                    Toast.makeText(this, "Invalid amount", Toast.LENGTH_SHORT).show()
                }
            } else {
                Toast.makeText(this, "Please enter an amount", Toast.LENGTH_SHORT).show()
            }
        }
        
        cancelButton.setOnClickListener {
            finish()
        }
    }
    
    private fun savePendingTransaction(amount: Double, description: String) {
        val filesDir = filesDir
        val pendingFile = File(filesDir, "pending_transactions.json")
        
        val transaction = JSONObject().apply {
            put("amount", amount)
            put("description", description)
            put("timestamp", System.currentTimeMillis())
            put("type", "expense")
        }
        
        val transactions = if (pendingFile.exists()) {
            val jsonString = pendingFile.readText()
            JSONArray(jsonString)
        } else {
            JSONArray()
        }
        
        transactions.put(transaction)
        pendingFile.writeText(transactions.toString())
    }
}
