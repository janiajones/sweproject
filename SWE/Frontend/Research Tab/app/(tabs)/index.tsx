import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  View,
  FlatList,
  Linking,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';

import { useState } from 'react'; // React hook to manage state
import { ThemedView } from '@/components/ThemedView';

interface Article {
  id: number;
  title: string;
  url: string;
}

export default function HomeScreen() {
  const [text, setText] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);  // Store the articles returned from the backend
  const [loading, setLoading] = useState(false);

  const handleSend = async () => { // called when the user presses "Submit"
    setLoading(true);
    try {
      // Send a POST request to the backend with the user's text
      const response = await fetch('http://10.228.244.87:3000/api/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }), // Send the text as JSON
      });

      const data = await response.json(); // Get the response data

      setArticles(data.articles); // ✅ Save articles to state
      setLoading(false);
    } catch (err) {
      console.error('Error:', err); // Handle network or server errors
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <ThemedView style={styles.container}>
      {/* ✅ User input area */}
      <View style={styles.textBox}>
        <TextInput
          style={styles.input}
          placeholder="Begin today's health diary here..."
          placeholderTextColor="#888"
          value={text}
          onChangeText={setText} // Update text state as the user types
          multiline // Allows multiple lines of text
          //onSubmitEditing={() => Keyboard.dismiss()}
        />

        {/* ✅ Submit button */}
        <TouchableOpacity style={styles.button} onPress={handleSend}>
          <Text style={styles.buttonText}>Submit</Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#666" />
          <Text style={styles.loadingText}> Generating articles...</Text>
        </View>
      )}
      {/* ✅ Display the articles as a list */}
      <FlatList
        data={articles} // List of articles to show
        keyExtractor={(item) => item.id.toString()} // Unique key for each item
        style={styles.articleList}
        contentContainerStyle={styles.articleListContent}
        renderItem={({ item }) => (
          // When clicked, open the article link in the browser
          <TouchableOpacity
            onPress={() => Linking.openURL(item.url)}
            style={styles.articleItem}
          >
            <Text style={styles.articleTitle}>{item.title}</Text>
          </TouchableOpacity>
        )}
      />
    </ThemedView>
    </TouchableWithoutFeedback>
  );
}

// ✅ Styling for the screen
const styles = StyleSheet.create({
  container: {
    flex: 1, // Takes up full screen
    justifyContent: 'center', // Center items vertically
    alignItems: 'center',     // Center items horizontally
    padding: 20,
  },
  textBox: {
    width: 250,
    height: 400,
    marginTop: 80,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    padding: 16,
    justifyContent: 'space-between', // Puts space between input and button
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3, // Shadow on Android
  },
  input: {
    flex: 1, // Take up all available space inside the text box
    fontSize: 16,
    textAlignVertical: 'top', // Start text at the top (Android fix)
    padding: 10,
  },
  button: {
    backgroundColor: '#cccccc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'flex-end', // Align button to the right
    marginTop: 10,
  },
  buttonText: {
    fontSize: 14,
    color: '#333',
  },
  articleList: {
    marginTop: 20,
    width: '90%', // Almost full width
  },
  articleListContent: {
    paddingBottom: 60, // Add space at bottom in case content is long
  },
  articleItem: {
    padding: 12,
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
  articleTitle: {
    fontSize: 16,
    color: '#222',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  }, 
});