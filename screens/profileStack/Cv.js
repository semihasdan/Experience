import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Button, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import firebase from 'firebase/compat';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Divider, Card, Icon } from 'react-native-elements';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const Cv = ({ navigation }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState({});
    const [keywords, setKeywords] = useState([]);
    const [currentKeyword, setCurrentKeyword] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isDialogVisible, setIsDialogVisible] = useState(false);
    const [history, setHistory] = useState('');
    const [portfolio, setPortfolio] = useState([]);
    const [modalHistory, setModalHistory] = useState('');
    const [portfolios, setPortfolios] = useState([]);
    const [selectedPortfolio, setSelectedPortfolio] = useState(null);

    useEffect(() => {
        const unsubscribe = firebase.auth().onAuthStateChanged(async (authUser) => {
            setUser(authUser);
            if (authUser) {
                await fetchUserData(authUser.uid);
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchUserData = async (userId) => {
        try {
            const userDoc = await firebase.firestore().collection('users').doc(userId).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                setUserData(data);
                setHistory(data.history || '');
                setKeywords(data.keyExperiences || []);
                setPortfolios(data.portfolio || []);
            } else {
                console.log('No user document found!');
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const saveCv = async () => {
        try {
            const userId = user.uid;

            await firebase.firestore().collection('users').doc(userId).update({
                history: history,
                portfolio: [
                ],
                keyExperiences: keywords,
            });

            console.log('CV saved successfully');
        } catch (error) {
            console.error('Error saving CV:', error);
        }
    };
    const saveHistory = async (newHistory) => {
        try {
            const userId = user.uid;

            await firebase.firestore().collection('users').doc(userId).update({
                history: newHistory,
            });

            setHistory(newHistory);
            setIsDialogVisible(false);
        } catch (error) {
            console.error('Error saving history:', error);
        }
    };

    const openPortfolioModal = (portfolio) => {
        setSelectedPortfolio(portfolio);
    };

    const closePortfolioModal = () => {
        setSelectedPortfolio(null);
    };

    const renderPortfolioCard = (portfolio, index) => {
        return (
            <TouchableOpacity key={index} style={styles.card} onPress={() => openPortfolioModal(portfolio)}>
                <Image source={{ uri: portfolio.images[0] }} style={styles.cardImage} />
                <Text style={styles.cardText}>{portfolio.title}</Text>
                <Text style={styles.cardDescription}>{portfolio.description}</Text>
            </TouchableOpacity>
        );
    };

    const handleKeywordInputChange = (text) => setCurrentKeyword(text);

    const handleKeywordInputSubmit = async () => {
        if (currentKeyword.trim() !== '') {
            const newKeyword = currentKeyword.trim();
            setKeywords([...keywords, newKeyword]);
            setCurrentKeyword('');

            try {
                await firebase.firestore().collection('users').doc(user.uid).update({
                    keyExperiences: firebase.firestore.FieldValue.arrayUnion(newKeyword),
                });
            } catch (error) {
                console.error('Error adding keyword to Firebase:', error);
            }
        }
    };

    const handleRemoveKeyword = async (index) => {
        const removedKeyword = keywords[index];
        setKeywords(keywords.filter((_, idx) => idx !== index));

        try {
            await firebase.firestore().collection('users').doc(user.uid).update({
                keyExperiences: firebase.firestore.FieldValue.arrayRemove(removedKeyword),
            });
        } catch (error) {
            console.error('Error removing keyword from Firebase:', error);
        }
    };
    const renderPortfolioModal = () => {
        if (!selectedPortfolio) {
          return null;
        }
    
        return (
          <Modal
            animationType="slide"
            transparent={true}
            visible={!!selectedPortfolio}
            onRequestClose={closePortfolioModal}
          >
            <View style={styles.centeredView}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>{selectedPortfolio.title}</Text>
                <ScrollView>
                  {selectedPortfolio.images.map((image, index) => (
                    <Image
                      key={index}
                      source={{ uri: selectedPortfolio.images }}
                      style={styles.modalImage}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
    
                <Text style={styles.modalDescription}>{selectedPortfolio.description}</Text>
    
                <TouchableOpacity onPress={closePortfolioModal} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        );
      };

    return (
        <KeyboardAwareScrollView style={styles.container}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <MaterialCommunityIcons name="arrow-left" size={25} color="#000" />
            </TouchableOpacity>
            <View style={styles.profileSection}>
                <Image
                    source={{ uri: userData.profilePhoto || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUuYxlRTWhs8r8sInEW_lRbEtiybKkmGjKtAD3TNCxer01z0j-iqFJApomq0b5yEMJYo4&usqp=CAU' }}
                    style={styles.profileImage}
                />
                <Text style={styles.userNameText}>{`${userData.name || ''} ${userData.surname || ''}`}</Text>
            </View>

            <View style={styles.historySection}>
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={isDialogVisible}
                    onRequestClose={() => setIsDialogVisible(false)}
                >
                    <View style={styles.centeredView}>
                        <View style={styles.modalView}>
                            <Text style={styles.modalTitle}>Edit History</Text>
                            <TextInput
                                style={styles.historyInputModal}
                                multiline={true}
                                placeholder="Describe your Experience history"
                                value={modalHistory}
                                onChangeText={setModalHistory}
                            />

                            <TouchableOpacity style={[styles.button, styles.buttonSave]} onPress={() => saveHistory(modalHistory)}>
                                <Text style={styles.buttonText}>Save</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={() => setIsDialogVisible(false)}>
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <View style={styles.historySection}>
                    <View style={styles.historyHeader}>
                        <Text style={styles.sectionHeader}>Experience history</Text>
                        <TouchableOpacity onPress={() => setIsDialogVisible(true)} style={styles.editButton}>
                            <Icon name="edit" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.historyInput}
                        multiline={true}
                        placeholder="Describe your Experience history"
                        value={history}
                        onChangeText={setHistory}
                        editable={false}
                    />

                </View>
            </View>

            <View style={styles.section}>
                <View style={styles.addPortfolio1}>
                    <Text style={styles.header}>Portfolios</Text>
                    <View style={styles.addPortfolio}>
                        <Icon name="add-circle-outline" size={24} color="#4CAF50"
                            onPress={() => navigation.navigate('PortfolioAddScreen')} />
                    </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {portfolios.map(renderPortfolioCard)}
                </ScrollView>
            </View>
            <View style={styles.section}>
                <Text style={styles.header}>Key Experiences</Text>
                <View style={styles.keywordsContainer}>
                    <TextInput
                        style={styles.keywordInput}
                        placeholder="Enter keywords (Press Enter to add)"
                        value={currentKeyword}
                        onChangeText={handleKeywordInputChange}
                        onSubmitEditing={handleKeywordInputSubmit}
                    />
                    <View style={styles.keywordList}>
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
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.header}>Comments</Text>
                <Divider style={styles.divider} />
                <Button style={styles.saveCv} title="Save CV" onPress={saveCv} />

            </View>

            {renderPortfolioModal()}
        </KeyboardAwareScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        paddingHorizontal: 10,
    },
    backButton: {
        paddingTop: 60,
        marginLeft: 15,
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#2a9d8f',
        marginBottom: 8,
    },
    userNameText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#264653',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#264653',
        paddingBottom: 10,
    },
    header: {
        fontSize: 20,
        fontWeight: '600',
        color: '#264653',
        paddingVertical: 10,
    },
    editButton: {
        backgroundColor: '#2a9d8f',
        borderRadius: 20,
        padding: 6,
        alignSelf: 'flex-end',
        marginTop: 0,
        marginLeft: `auto`,
    },
    historyHeader: {
        flexDirection: 'row'
    },
    historySection: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
    },
    historyInput: {
        fontSize: 16,
        color: '#343a40',
        minHeight: 100,
        textAlignVertical: 'top',
        padding: 8,
    },
    addPortfolio: {
        marginLeft: `auto`,
        paddingTop: 10

    },
    addPortfolio1: {
        flexDirection: `row`,

    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 10,
        marginHorizontal: 10,
        width: 150,
        height: 250,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
    },
    cardImage: {
        width: '100%',
        height: 120,
        borderRadius: 4,
        marginBottom: 8,
    },
    cardText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#264653',
        marginBottom: 4,
    },
    cardDescription: {
        fontSize: 14,
        color: '#495057',
    },
    keywordsContainer: {
        marginBottom: 20,
        marginRight: 30,
    },
    keywordList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 5,
    },
    keywordChip: {
        backgroundColor: '#2a9d8f',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 12,
        margin: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    keywordText: {
        color: '#fff',
        fontWeight: 'bold',
        marginRight: 5,
    },
    keywordInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ced4da',
        padding: 8,
        fontSize: 16,
        margin: 4,
        borderRadius: 20,
    },
    commentsSection: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
    },
    saveButton: {
        backgroundColor: '#e76f51',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    closeButton: {
        backgroundColor: '#2196F3',
        borderRadius: 20,
        padding: 10,
        elevation: 2,
        marginTop: 20,
    },
    closeButtonText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 16,
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 22,
    },
    modalContent: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
});

export default Cv;