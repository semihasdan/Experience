import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import firebase from 'firebase/compat';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const PortfolioAddScreen = ({ navigation }) => {
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: () => (
        <View>
          <Text style={styles.headerName}>Portfolio Add</Text>
        </View>
      ),
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={25} color="#000" />
        </TouchableOpacity>
      ),
    });
  }, []);

  const [portfolioData, setPortfolioData] = useState({
    title: '',
    description: '',
    images: [],
  });

  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      alert('Permission to access camera roll is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync();
    if (!pickerResult.cancelled) {
      const imageUrl = await uploadImageAsync(pickerResult.uri);

      setPortfolioData({ ...portfolioData, images: [...portfolioData.images, imageUrl] });
    }
  };

  const uploadImageAsync = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();

    const storageRef = firebase.storage().ref();
    const imageRef = storageRef.child(`portfolio_images/${portfolioData.title}_${Date.now()}`);
    await imageRef.put(blob);

    return await imageRef.getDownloadURL();
  };

  const handleRemoveImage = (index) => {
    const updatedImages = [...portfolioData.images];
    updatedImages.splice(index, 1);
    setPortfolioData({ ...portfolioData, images: updatedImages });
  };

  const handleSavePortfolioItem = async () => {
    try {
      const userId = firebase.auth().currentUser.uid;

      await firebase.firestore().collection('users').doc(userId).update({
        portfolio: firebase.firestore.FieldValue.arrayUnion({
          title: portfolioData.title,
          description: portfolioData.description,
          images: portfolioData.images,
        }),
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error saving portfolio item:', error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={portfolioData.title}
        onChangeText={(text) => setPortfolioData({ ...portfolioData, title: text })}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        value={portfolioData.description}
        onChangeText={(text) => setPortfolioData({ ...portfolioData, description: text })}
      />

      <View style={styles.imageContainer}>
        {portfolioData.images.map((imageUrl, index) => (
          <View key={index} style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.removeImage} onPress={() => handleRemoveImage(index)}>
              <Text style={styles.removeImageText}>X</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleImagePick}>
        <Text style={styles.buttonText}>Pick an Image</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.buttonSave} onPress={handleSavePortfolioItem}>
        <Text style={styles.buttonText}>Save Portfolio Item</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  headerName: {
    fontWeight: 'bold',
    fontSize: 24,
  },
  backButton: {
    marginLeft: 20,
    padding: 5,
  },
  label: {
    fontSize: 18,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '50%',
    height: 'auto',
    marginBottom: 10,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 5,
  },
  removeImage: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonSave: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default PortfolioAddScreen;
