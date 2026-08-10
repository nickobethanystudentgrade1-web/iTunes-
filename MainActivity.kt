package com.example.zipapkextractor

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import java.io.BufferedInputStream
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream

class MainActivity : Activity() {

    private val pickFile = 100
    private lateinit var status: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 64, 48, 32)
        }

        val title = TextView(this).apply {
            text = "ZIP / APK Extractor"
            textSize = 28f
            setPadding(0, 0, 0, 24)
        }

        val description = TextView(this).apply {
            text = "Select a .zip or .apk file and extract its contents into the app's Documents folder."
            textSize = 16f
            setPadding(0, 0, 0, 32)
        }

        val button = Button(this).apply {
            text = "Choose ZIP / APK"
            setOnClickListener {
                val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                }
                startActivityForResult(intent, pickFile)
            }
        }

        status = TextView(this).apply {
            text = "Ready"
            textSize = 15f
            setPadding(0, 32, 0, 0)
        }

        root.addView(title)
        root.addView(description)
        root.addView(button)
        root.addView(status)

        setContentView(root)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == pickFile && resultCode == RESULT_OK) {
            data?.data?.let { extractArchive(it) }
        }
    }

    private fun extractArchive(uri: Uri) {
        Thread {
            try {
                val name = queryName(uri) ?: "archive"
                val safeBase = name.substringBeforeLast('.', name)
                    .replace(Regex("[^A-Za-z0-9._-]"), "_")
                val outputDir = File(getExternalFilesDir(null), "Extracted/$safeBase")
                outputDir.mkdirs()

                contentResolver.openInputStream(uri).use { input ->
                    requireNotNull(input) { "Unable to open selected file." }
                    ZipInputStream(BufferedInputStream(input)).use { zip ->
                        var entry: ZipEntry?
                        while (true) {
                            entry = zip.nextEntry ?: break
                            val current = entry!!
                            val target = File(outputDir, current.name)

                            // Prevent Zip Slip path traversal.
                            val canonicalBase = outputDir.canonicalPath + File.separator
                            if (!target.canonicalPath.startsWith(canonicalBase)) {
                                throw SecurityException("Unsafe archive entry: ${current.name}")
                            }

                            if (current.isDirectory) {
                                target.mkdirs()
                            } else {
                                target.parentFile?.mkdirs()
                                FileOutputStream(target).use { out ->
                                    zip.copyTo(out)
                                }
                            }
                            zip.closeEntry()
                        }
                    }
                }

                runOnUiThread {
                    status.text = "Extracted to:\n${outputDir.absolutePath}"
                    Toast.makeText(this, "Extraction complete", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                runOnUiThread {
                    status.text = "Error: ${e.message ?: "Unknown error"}"
                    Toast.makeText(this, "Extraction failed", Toast.LENGTH_LONG).show()
                }
            }
        }.start()
    }

    private fun queryName(uri: Uri): String? {
        contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
            ?.use { cursor ->
                if (cursor.moveToFirst()) {
                    return cursor.getString(0)
                }
            }
        return uri.lastPathSegment
    }
}
