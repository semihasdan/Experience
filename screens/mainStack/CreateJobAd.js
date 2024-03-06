import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { db } from '../Firebase';
import firebase from 'firebase/compat';
import { Icon } from 'react-native-elements';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const CreateJobAd = ({navigation}) => {
    const maxKeywordsCount = 10;

    const [jobTitle, setJobTitle] = useState('');
    const [description, setDescription] = useState('');
    const [expectedSkills, setExpectedSkills] = useState('');
    const [keywords, setKeywords] = useState([]);
    const [currentKeyword, setCurrentKeyword] = useState('');
    const [jobPrice, setJobPrice] = useState('');
    const [location, setLocation] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: true,
            headerTitle: () => (
                <View>
                    <Text style={styles.headerName}>Create New Ad</Text>
                </View>
            ),
            headerLeft: () => (
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={25} color="#000" />
                </TouchableOpacity>
            ),
        });
    }, []);

    useEffect(() => {
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                setCurrentUser(user);
            } else {
                setCurrentUser(null);
            }
        });

        return () => unsubscribe();
    }, []);
    
    const formatPrice = (value) => {
        let numericValue = value.replace(/[^0-9.]/g, '');
        if (numericValue.length > 8) {
            numericValue = numericValue.slice(0, 8);
        }
        if (numericValue === '' || numericValue === '.') {
            return numericValue;
        }
        let [integerPart, decimalPart] = numericValue.split('.');
        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        decimalPart = decimalPart ? decimalPart.slice(0, 2) : '00';
        return decimalPart.length === 1 ? `${integerPart}.${decimalPart}0` : `${integerPart}.${decimalPart}`;
    };    

    const handleCreateJobAd = async () => {
        try {
            if (!currentUser) {
                console.error('User not logged in');
                return;
            }

            if (!jobTitle || !description || !expectedSkills || !jobPrice) {
                Alert.alert('Warning', 'Please fill in all required fields.');
                return;
            }

            const priceValue = parseFloat(jobPrice);
            if (isNaN(priceValue)) {
                Alert.alert('Warning', 'Please enter a valid numeric value for the job price.');
                return;
            }

            if (priceValue < 10) {
                Alert.alert('Warning', 'The job price must be at least $10.');
                return;
            }

            const jobAdRef = await db.collection('jobPostings').add({
                title: jobTitle,
                description,
                skills: expectedSkills,
                keywords,
                price: priceValue,
                location,
                publishedTime: new Date().toISOString(),
                createdBy: currentUser.uid,
                status: "pending",
            });
            setJobTitle('');
            setDescription('');
            setExpectedSkills('');
            setKeywords([]);
            setCurrentKeyword('');
            setJobPrice('');
            setLocation('');

            console.log('Job ad created with ID:', jobAdRef.id);
        } catch (error) {
            console.error('Error creating job ad', error);
        }
    };

    const handleKeywordInputChange = (text) => {
        setCurrentKeyword(text);
    };

    const handleKeywordInputSubmit = () => {
        if (currentKeyword.trim() !== '' && keywords.length < maxKeywordsCount) {
            setKeywords([...keywords, currentKeyword.trim()]);
            setCurrentKeyword('');
        }
    };

    const handleRemoveKeyword = (index) => {
        const updatedKeywords = [...keywords];
        updatedKeywords.splice(index, 1);
        setKeywords(updatedKeywords);
    };

    const renderCharCount = (value, maxChars) => {
        if (value.length >= maxChars - 10) {
            return (
                <View style={styles.charCountContainer}>
                    <Text style={styles.charCount}>
                        {value.length}/{maxChars}
                    </Text>
                </View>
            );
        }
        return null;
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.form}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Job Title"
                        value={jobTitle}
                        maxLength={50}
                        onChangeText={setJobTitle}
                        onSubmitEditing={() => { descriptionText.focus(); }}
                    />
                    {renderCharCount(jobTitle, 50)}
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        ref={(input) => { descriptionText = input; }}
                        style={[styles.input, styles.inputDescription]}
                        placeholder="Description"
                        value={description}
                        multiline={true}
                        numberOfLines={4}
                        maxLength={700}
                        onChangeText={setDescription}
                        onSubmitEditing={() => { skillsText.focus(); }}
                    />
                    {renderCharCount(description, 700)}
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        ref={(input) => { skillsText = input; }}
                        style={styles.input}
                        placeholder="Expected Skills"
                        value={expectedSkills}
                        maxLength={100}
                        onChangeText={setExpectedSkills}
                        onSubmitEditing={() => { keywordsText.focus(); }}
                    />
                    {renderCharCount(expectedSkills, 100)}
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        ref={(input) => { keywordsText = input; }}
                        style={styles.input}
                        placeholder="Keywords (Press Enter to add)"
                        value={currentKeyword}
                        maxLength={20}
                        onChangeText={handleKeywordInputChange}
                        onSubmitEditing={handleKeywordInputSubmit}
                    />
                    {renderCharCount(currentKeyword, 20)}
                    <View style={styles.keywordContainer}>
                        {keywords.map((keyword, index) => (
                            <View key={index} style={styles.keywordChip}>
                                <Text style={styles.keywordText}>{keyword}</Text>
                                <Icon
                                    name="close"
                                    type="material"
                                    color="white"
                                    size={16}
                                    onPress={() => handleRemoveKeyword(index)}

                                />
                            </View>
                        ))}
                    </View>
                    {keywords.length >= maxKeywordsCount && (
                        <Text style={styles.maxKeywordsReached}>
                            Maximum number of keywords reached ({maxKeywordsCount}).
                        </Text>
                    )}
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Job Price"
                        value={jobPrice}
                        onChangeText={(text) => setJobPrice(formatPrice(text))}
                        keyboardType="numeric"
                        onSubmitEditing={() => { locationText.focus(); }}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <TextInput
                        ref={(input) => { locationText = input; }}
                        style={styles.input}
                        placeholder="Location (optional)"
                        value={location}
                        maxLength={30}
                        onChangeText={setLocation}
                    />
                    {renderCharCount(location, 30)}
                </View>
                <TouchableOpacity style={styles.createButton} onPress={handleCreateJobAd}>
                    <Text style={styles.createButtonText}>Create Job Ad</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f4f8',
    },
    headerName: {
        fontSize: 20,
    },
    backButton: {
        marginLeft: 20,
        padding: 5,
    },
    form: {
        padding: 20,
        paddingTop: 30,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 15,
        fontSize: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    inputDescription: {
        minHeight: 50,
        paddingTop: 15,
    },
    createButton: {
        backgroundColor: '#34A853',
        borderRadius: 30,
        padding: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    inputContainer: {
        marginBottom: 20,
    },
    charCountContainer: {
        position: 'absolute',
        right: 15,
        bottom: 5,
    },
    charCount: {
        textAlign: 'right',
        fontSize: 12,
        color: '#757575',
        marginBottom: -10,
        marginRight: 20,
    },
    keywordContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
    },
    keywordChip: {
        backgroundColor: '#59ff6e',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginVertical: 5,
        marginRight: 5,
        flexDirection: 'row',
        alignItems: 'center',
    },
    keywordText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
        marginRight: 5,
    },
    maxKeywordsReached: {
        color: 'red',
        fontSize: 12,
        marginTop: 5,
    },
});

export default CreateJobAd;