import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Button, TextInput, Subheading } from 'react-native-paper';
import firebase from 'firebase/compat';
import { db } from './Firebase';
import Logo from '../assets/Logo.png';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignIn({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const passwordInput = useRef();
    const LogInAuto = async (mail, pass) => {
        await firebase.auth().signInWithEmailAndPassword(mail, pass);
    };
    useEffect(() => {
        const retrieveCredentials = async () => {
            try {
                const storedEmail = await AsyncStorage.getItem('email');
                const storedPassword = await AsyncStorage.getItem('password');

                if (storedEmail && storedPassword) {
                    setEmail(storedEmail);
                    setPassword(storedPassword);

                    LogInAuto(storedEmail, storedPassword);


                }
            } catch (error) {
                console.error('Error retrieving credentials:', error);
            }
        };

        retrieveCredentials();
    }, []);

    const LogIn = async () => {
        setIsLoading(true);
        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            await AsyncStorage.setItem('email', email);
            await AsyncStorage.setItem('password', password);
            navigation.navigate('Main');
        } catch (e) {
            setError(e.message);
        }
        setIsLoading(false);
    };

    return (
        <View style={styles.container}>
            <Animatable.View animation="bounceInDown" duration={1500} style={styles.logoContainer}>
                <Image source={Logo} style={styles.logo} />
            </Animatable.View>
            <Animatable.View animation="fadeInUp" duration={1500} style={styles.formContainer}>
                {!!error && (
                    <Subheading style={styles.errorText}>
                        {error}
                    </Subheading>
                )}
                <TextInput
                    label="Email"
                    mode="outlined"
                    style={styles.input}
                    value={email}
                    onChangeText={(text) => setEmail(text)}
                    keyboardType='email-address'
                    returnKeyType='next'
                    onSubmitEditing={() => passwordInput.current.focus()}
                />
                <TextInput
                    ref={passwordInput}
                    label="Password"
                    mode="outlined"
                    style={styles.input}
                    value={password}
                    onChangeText={(text) => setPassword(text)}
                    secureTextEntry
                    returnKeyType='done'
                    onSubmitEditing={LogIn}
                />
                <Button
                    mode="contained"
                    loading={isLoading}
                    onPress={LogIn}
                    style={styles.button}
                >
                    Sign In
                </Button>
                <Button
                    mode="outlined"
                    onPress={() => navigation.navigate('SignUp')}
                    style={styles.button}
                >
                    Don't have an account? Sign Up
                </Button>
            </Animatable.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
    },
    logoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 150,
        height: 150,
        resizeMode: 'contain',
    },
    formContainer: {
        flex: 2,
        padding: 20,
    },
    input: {
        marginBottom: 10,
    },
    button: {
        marginTop: 10,
    },
    errorText: {
        color: 'red',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    secondaryButton: {
        padding: 10,
        marginVertical: 10,
        borderColor: '#4285F4',
    },
});

