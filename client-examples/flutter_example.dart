import 'dart:io';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:image_picker/image_picker.dart';

class StickerLabAPI {
  static const String baseUrl = 'https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/api';
  
  static Future<Map<String, dynamic>> createStickerPack({
    required String name,
    required String creatorId,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/createStickerPack'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'name': name, 'creatorId': creatorId}),
    );
    
    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed: ${response.body}');
    }
  }

  static Future<Map<String, dynamic>> uploadSticker({
    required String stickerPackId,
    required File imageFile,
  }) async {
    var request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/uploadSticker'),
    );

    request.fields['stickerPackId'] = stickerPackId;
    request.files.add(await http.MultipartFile.fromPath('sticker', imageFile.path));

    var streamedResponse = await request.send();
    var response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed: ${response.body}');
    }
  }

  static Future<void> incrementDownload({required String stickerPackId}) async {
    final response = await http.post(
      Uri.parse('$baseUrl/incrementDownload'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'stickerPackId': stickerPackId}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed: ${response.body}');
    }
  }

  static Future<List<dynamic>> getTopStickers({int limit = 20}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/topStickers?limit=$limit'),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['stickers'] ?? [];
    } else {
      throw Exception('Failed: ${response.body}');
    }
  }
}
