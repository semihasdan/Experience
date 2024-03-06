import React, { useState, useRef } from 'react';
import { View, StyleSheet, TextInput, Image, TouchableOpacity, Text } from 'react-native';
import { Button } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import firebase from 'firebase/compat';
import { db } from './Firebase';
import Logo from '../assets/Logo.png';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SignUp = ({ navigation }) => {
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const surnameInput = useRef();
    const emailInput = useRef();
    const passwordInput = useRef();

    const uploadImage = async (uri) => {
        const response = await fetch(uri);
        const blob = await response.blob();
        const storageRef = firebase.storage().ref().child(`profilePhotos/${new Date().toISOString()}`);
        const uploadTask = storageRef.put(blob);

        return new Promise((resolve, reject) => {
            uploadTask.on(
                firebase.storage.TaskEvent.STATE_CHANGED,
                () => { },
                reject,
                () => {
                    uploadTask.snapshot.ref.getDownloadURL().then(resolve);
                }
            );
        });
    };


    const createAccount = async () => {
        if (isLoading) return;

        setIsLoading(true);
        setError('');

        try {
            const photoUrl = profilePhoto ? await uploadImage(profilePhoto) : 'https://placeholder.com/default-avatar.png';

            const response = await firebase.auth().createUserWithEmailAndPassword(email, password);
            await response.user.updateProfile({ displayName: name });

            await AsyncStorage.setItem('email', email);
            await AsyncStorage.setItem('password', password);

            await db.collection('users').doc(response.user.uid).set({
                name,
                surname,
                email,
                profilePhoto: photoUrl,
                balance: 0,
            });

            setIsLoading(false);
            navigation.navigate('Profile', {
                name,
                surname,
                email,
                profilePhoto: photoUrl,
            });
        } catch (e) {
            setIsLoading(false);
            setError(e.message);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.cancelled) {
            setProfilePhoto(result.uri);
        }
    };

    return (
        <View style={styles.container}>
            <Animatable.View animation="fadeInDown" duration={1500} style={styles.logoContainer}>
                <Image source={Logo} style={styles.logo} />
            </Animatable.View>
            <Animatable.View animation="fadeInUp" duration={1500}>
                <TouchableOpacity onPress={pickImage} style={styles.profilePhoto}>
                    {profilePhoto ? (
                        <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
                    ) : (
                        <Text style={styles.profilePhotoText}>Tap to add photo</Text>
                    )}
                </TouchableOpacity>
                <TextInput
                    placeholder="Name"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                    returnKeyType="next"
                    onSubmitEditing={() => surnameInput.current.focus()}
                />
                <TextInput
                    ref={surnameInput}
                    placeholder="Surname"
                    value={surname}
                    onChangeText={setSurname}
                    style={styles.input}
                    returnKeyType="next"
                    onSubmitEditing={() => emailInput.current.focus()}
                />
                <TextInput
                    ref={emailInput}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInput.current.focus()}
                />
                <TextInput
                    ref={passwordInput}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                    secureTextEntry
                    returnKeyType="done"
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Button mode="contained" onPress={createAccount} loading={isLoading} style={styles.button}>
                    Sign Up
                </Button>
                <Button mode="text" onPress={() => navigation.navigate('SignIn')} style={styles.button}>
                    Already have an account? Sign In
                </Button>
            </Animatable.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'stretch',
        backgroundColor: '#fff',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logo: {
        height: 120,
        width: 120,
        resizeMode: 'contain',
    },
    profilePhoto: {
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#eeeeee',
        borderRadius: 50,
        height: 100,
        width: 100,
        alignSelf: 'center',
    },
    profileImage: {
        height: 100,
        width: 100,
        borderRadius: 50,
    },
    profilePhotoText: {
        color: '#888888',
    },
    input: {
        marginBottom: 10,
        paddingHorizontal: 15,
        height: 50,
        fontSize: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'gray',
    },
    error: {
        color: 'red',
        marginBottom: 10,
    },
    button: {
        marginTop: 10,
    },
});

export default SignUp;
