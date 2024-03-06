import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Modal, ScrollView, Dimensions, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firebase from 'firebase/compat';
import { db } from '../Firebase';
import { Divider } from 'react-native-elements';
import Logo from '../../assets/Logo.png';

function Notifications({ navigation }) {
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedUserCV, setSelectedUserCV] = useState(null);
    const [showIncoming, setShowIncoming] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, [showIncoming]);

    const fetchNotifications = async () => {
        setIsLoading(true);
        if (firebase.auth().currentUser) {
            let query;
            if (showIncoming) {
                query = db.collection('offers').where('createdBy', '==', firebase.auth().currentUser.uid);
            } else {
                query = db.collection('offers').where('applicantId', '==', firebase.auth().currentUser.uid);
            }

            const offersSnapshot = await query.get();

            const notificationsData = await Promise.all(
                offersSnapshot.docs.map(async (doc) => {
                    const offerData = doc.data();
                    const jobPostingSnapshot = await db.collection('jobPostings').doc(offerData.jobPostingId).get();
                    const jobPostingData = jobPostingSnapshot.data();

                    const senderUserSnapshot = await db.collection('users').doc(offerData.applicantId).get();
                    const senderUserData = senderUserSnapshot.data();

                    return {
                        id: doc.id,
                        jobPostingData: jobPostingData,
                        title: jobPostingData.title,
                        description: jobPostingData.description.substring(0, 50) + '...',
                        offerTitle: offerData.title,
                        offerDescription: offerData.description,
                        offerPrice: offerData.offerPrice,
                        timestamp: offerData.timestamp.toDate().toLocaleString(),
                        senderName: senderUserData.name,
                        senderSurname: senderUserData.surname,
                        senderProfilePhoto: senderUserData.profilePhoto,
                        senderId: offerData.applicantId,
                        status: offerData.status || 'pending',
                    };
                })
            );

            setNotifications(notificationsData);
            setIsLoading(false);
        }
    };

    const handleAccept = (notificationId) => {
        Alert.alert(
            'Accept Offer',
            'Are you sure you want to accept this offer?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Accept',
                    onPress: () => handleAcceptConfirmation(notificationId),
                },
            ],
            { cancelable: false }
        );
    };

    const handleAcceptConfirmation = async (notificationId) => {
        const notification = notifications.find((notif) => notif.id === notificationId);
        if (!notification) {
            console.error('Notification not found');
            return;
        }
    
        try {
            const bidSnapshot = await db.collection('offers').doc(notificationId).get();
            const bidData = bidSnapshot.data();
    
            const advertiserUserSnapshot = await db.collection('users').where('email', '==', bidData.advertiserEmail).get();
            const bidderUserSnapshot = await db.collection('users').doc(bidData.applicantId).get();
    
            if (advertiserUserSnapshot.docs.length > 0 && bidderUserSnapshot.exists) {
                const advertiserUserData = advertiserUserSnapshot.docs[0].data();
                const bidderUserData = bidderUserSnapshot.data();
    
                if (advertiserUserData.balance < bidData.offerPrice) {
                    Alert.alert('Warning', 'The advertiser\'s balance is insufficient..', [
                        { text: 'Ok' },
                    ]);
                } else {
                    await db.collection('offers').doc(notificationId).update({ status: 'accepted' });
    
                    const updatedAdvertiserBalance = advertiserUserData.balance - bidData.offerPrice;
                    await db.collection('users').doc(advertiserUserSnapshot.docs[0].id).update({ balance: updatedAdvertiserBalance });
                    const currentUserEmail = firebase.auth().currentUser.email;
                    const otherUserEmail = bidData.applicantEmail;
                    const chatRef = firebase.firestore().collection("chats").doc();
                    await chatRef.set({
                        users: [firebase.auth().currentUser.email, bidData.applicantEmail], 
                        usersId:[firebase.auth().currentUser.uid, bidData.applicantId],
                        offerId: notificationId,
                    });
    
                    navigation.navigate("Chat", {
                        chatId: chatRef.id,
                        recipientName: notification.senderName,
                        recipientPhoto: notification.senderProfilePhoto,
                    });
    
                    await fetchNotifications();
                }
            } else {
                Alert.alert('Warning', 'Unexpected error...', [
                    { text: 'Ok' },
                ]);
                console.error('User not found with the specified email');
            }
        } catch (error) {
            console.error('Error accepting offer and creating or redirecting to chat:', error);
        }
    };    
    
    const handleReject = (notificationId) => {
        Alert.alert(
            'Reject Offer',
            'Are you sure you want to reject this offer?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Reject',
                    onPress: () => handleRejectConfirmation(notificationId),
                },
            ],
            { cancelable: false }
        );
    };

    const handleRejectConfirmation = async (notificationId) => {

        await db.collection('offers').doc(notificationId).update({ status: 'rejected' });
        await fetchNotifications();
    };

    const renderNotificationItem = ({ item }) => {
        const isSentOffer = !showIncoming;
        if (item.status === "pending") {
            return (
                <View style={styles.notificationItem}>
                    <View style={styles.notificationContent}>
                        <Text style={styles.notificationTitle}>{item.offerTitle}</Text>
                        <Text style={styles.notificationText}>{item.offerDescription}</Text>
                        <Divider style={styles.divider} />
                        <Text style={styles.notificationPrice}>Your Offer: ${item.offerPrice}</Text>
                        <Text style={styles.notificationTimestamp}>{item.timestamp}</Text>
                        <View style={styles.senderInfo}>
                            {item.senderProfilePhoto && (
                                <Image
                                    source={{ uri: item.senderProfilePhoto }}
                                    style={styles.senderProfilePhoto}
                                />
                            )}
                            <Text style={styles.senderInfoText}>{item.senderName} {item.senderSurname}</Text>
                        </View>
                    </View>
                    <View style={styles.actions}>
                        {isSentOffer ? (
                            <Text style={styles.statusText}>{getStatusText(item)}</Text>
                        ) : (
                            <>
                                <TouchableOpacity onPress={() => handleViewCV(item.senderId)}>
                                    <Text style={styles.viewCVButton}>View CV</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleAccept(item.id)}>
                                    <Icon name="check-circle" size={24} color="green" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleReject(item.id)}>
                                    <Icon name="close-circle" size={24} color="red" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleViewJobDetails(item.jobPostingData)}>
                                    <Text style={styles.jobDetailsButton}>View Job Details</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            );
        } else if (isSentOffer) {
            return (
                <View style={styles.notificationItem}>
                    <View style={styles.notificationContent}>
                        <Text style={styles.notificationText}>{item.offerTitle}</Text>
                        <Text style={styles.notificationText}>{item.offerDescription}</Text>
                        <Divider style={styles.divider} />
                        <Text style={styles.notificationPrice}>Your Offer: ${item.offerPrice}</Text>
                        <Text style={styles.notificationTimestamp}>{item.timestamp}</Text>
                        <View style={styles.senderInfo}>
                            {item.senderProfilePhoto && (
                                <Image
                                    source={{ uri: item.senderProfilePhoto }}
                                    style={styles.senderProfilePhoto}
                                />
                            )}
                            <View style={{flexDirection:"colum"}}>
                                <Text style={styles.senderInfoText}>{item.senderName} {item.senderSurname}</Text>
                                <Text style={styles.statusText}>{getStatusText(item)}</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleViewJobDetails(item.jobPostingData)}>
                                    <Text style={styles.jobDetailsButton}>View Job Details</Text>
                                </TouchableOpacity>
                        </View>
                    </View>
                </View>
            );
        } else if (!isSentOffer && !item.status === "pending") {
            return (
                <View style={styles.noNotification}>
                    <Text style={styles.noNotificationText}> You don't have any Notification</Text>
                </View>
            )
        }
    };
    
    const handleViewJobDetails = (item) => {
        navigation.navigate('ChatDetails', { jobDetails: item });
    };
    

    const getStatusText = (item) => {
        const { status } = item;

        if (status === 'accepted') {
            return <View><Text style={{ color: "green" }}>Accepted</Text></View>;
        } else if (status === 'rejected') {
            return <View><Text style={{ color: "red" }}>Rejected</Text></View>;
        } else {
            return <View><Text style={{ color: "yellow" }}>Not answered</Text></View>;
        }
    };

    const handleViewCV = async (userId) => {
        await fetchUserCV(userId);
        setModalVisible(true);
    };

    const fetchUserCV = async (userId) => {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                setSelectedUserCV(userData);
            } else {
            }
        } catch (error) {
            console.error('Error fetching user CV:', error);
        }
    };

    const [modalVisible, setModalVisible] = useState(false);

    const closeModal = () => {
        setModalVisible(false);
        setSelectedUserCV(null);
    };

    const ModalContent = ({ userCV }) => {
        return (
            <>
                <View style={styles.profileSection}>
                    <Image
                        source={{ uri: userCV.profilePhoto }}
                        style={styles.profileImage}
                    />
                    <Text style={styles.profileName}>{userCV.name}</Text>
                    <Text style={styles.profileTitle}>{"User's Title"}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Experience History</Text>
                    <Text style={styles.sectionContent}>{userCV.history}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Key Experiences</Text>
                    <View style={styles.tagContainer}>
                        {userCV.keyExperiences && userCV.keyExperiences.map((exp, index) => (
                            <View key={index} style={styles.tag}>
                                <Text style={styles.tagText}>{exp}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Portfolios</Text>
                    {userCV.portfolio && userCV.portfolio.length > 0 ? (
                        userCV.portfolio.map((portfolio, index) => (
                            <View key={index} style={styles.portfolioItem}>
                                <Text style={styles.portfolioTitle}>{portfolio.title}</Text>
                                <Text style={styles.portfolioDescription}>{portfolio.description}</Text>
                                {portfolio.images && portfolio.images.length > 0 && (
                                    <View>
                                        <Text>Portfolio Images:</Text>
                                        {portfolio.images.map((image, imageIndex) => (
                                            <Image
                                                key={imageIndex}
                                                source={{ uri: image }}
                                                style={styles.portfolioImage}
                                            />
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))
                    ) : (
                        <Text>No portfolios available</Text>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Comments</Text>
                </View>
            </>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.optionButtonsContainer}>
                <TouchableOpacity
                    style={[styles.optionButton, showIncoming ? styles.selectedOption : null]}
                    onPress={() => setShowIncoming(true)}
                >
                    <Text style={styles.optionButtonText}>Incoming Offers</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.optionButton, !showIncoming ? styles.selectedOption : null]}
                    onPress={() => setShowIncoming(false)}
                >
                    <Text style={styles.optionButtonText}>Sent Offers</Text>
                </TouchableOpacity>
            </View>
            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0000ff" />
                </View>
            )}
            {!isLoading && (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderNotificationItem}
                    refreshing={isLoading}
                    onRefresh={fetchNotifications}
                />
            )}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={closeModal}
                onDismiss={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <ScrollView
                            contentContainerStyle={styles.scrollViewContent}
                        >
                            {selectedUserCV && <ModalContent userCV={selectedUserCV} />}

                            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                                <Text style={styles.closeButtonText}>Close</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const { width, height } = Dimensions.get('window');
const basePadding = 10;
const borderRadius = 10;

const colors = {
    primary: '#4a90e2',
    secondary: '#f4f4f4',
    textPrimary: '#333333',
    textSecondary: '#555555',
    background: '#ffffff',
    accent: '#2a9d8f',
    divider: '#e1e1e1',
    icon: '#555555',
    error: '#ff0033',
    success: '#00cc66',
    alert: '#ffcc00',
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: basePadding * 4,
    },
    header: {
        fontSize: 22,
        fontWeight: '600',
        paddingVertical: basePadding * 2,
        paddingHorizontal: basePadding * 2,
        backgroundColor: colors.secondary,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    optionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: basePadding,
        paddingTop: 20,

    },
    optionButton: {
        padding: basePadding,
        borderRadius: borderRadius,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    selectedOption: {
        backgroundColor: colors.success + '20',
    },
    optionButtonText: {
        color: colors.primary,
        fontWeight: '600',
    },
    notificationItem: {
        backgroundColor: colors.background,
        padding: basePadding * 2,
        marginBottom: basePadding,
        borderRadius: borderRadius,
        borderWidth: 1,
        borderColor: colors.divider,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
    },
    notificationContent: {
        flex: 1,
        marginBottom: basePadding,
    },
    notificationTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: basePadding / 2,
    },
    notificationText: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: basePadding / 2,
    },
    notificationPrice: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.success,
    },
    notificationTimestamp: {
        fontSize: 14,
        color: colors.icon,
        marginBottom: basePadding / 2,
    },
    senderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: basePadding,
    },
    senderInfoText: {
        bottom: 2,
        fontSize: 16,
        color: colors.textPrimary,
        marginLeft: basePadding,
    },
    senderProfilePhoto: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginTop: basePadding,
    },
    actionButton: {
        marginRight: basePadding,
    },
    viewCVButton: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.accent,
    },
    jobDetailsButton: {
        backgroundColor: "#4a90e2",
        color: 'white',
        paddingHorizontal: 20,
        paddingVertical: 5,
        textAlign: 'center',
        bottom: 5,
        left: 100,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(110, 110, 110, 0.1)',
    },
    modalContainer: {
        width: '90%',
        backgroundColor: colors.background,
        borderRadius: borderRadius,
        padding: basePadding,
        maxHeight: '80%',
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: basePadding * 2,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: colors.accent,
    },
    profileName: {
        fontSize: 24,
        fontWeight: '600',
        color: colors.textPrimary,
        marginTop: basePadding,
    },
    section: {
        marginBottom: basePadding * 2,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: basePadding,
    },
    sectionContent: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: basePadding,
    },
    tag: {
        backgroundColor: colors.divider,
        borderRadius: borderRadius,
        padding: basePadding,
        marginRight: basePadding,
        marginBottom: basePadding,
    },
    tagText: {
        color: colors.textPrimary,
        fontWeight: '500',
    },
    portfolioImage: {
        width: width * 0.3,
        height: width * 0.3,
        borderRadius: borderRadius,
        marginRight: basePadding,
        marginBottom: basePadding,
    },
    closeButton: {
        alignSelf: 'flex-end',
        backgroundColor: colors.error,
        borderRadius: borderRadius,
        padding: basePadding,
        marginTop: basePadding * 2,
    },
    closeButtonText: {
        color: colors.background,
        fontSize: 16,
        fontWeight: '600',
    },
    statusText: {
        fontSize: 16,
        fontWeight: '600',
        top:10
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    divider: {
        backgroundColor: colors.divider,
        marginVertical: basePadding,
    },

});
export default Notifications;
